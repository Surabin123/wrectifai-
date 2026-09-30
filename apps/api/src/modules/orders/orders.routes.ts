import { Router } from 'express';
import { getDbPool } from '../../config/database';
import { success, error } from '../../utils/response';
import { authenticate, requireRole } from '../../middleware/auth';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { validateOffer, recordOfferRedemption } from '../offers/offers.service';
import { NotificationsService } from '../notifications/notifications.service';

export const ordersRouter = Router();

function getRazorpayClient(): Razorpay {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
  });
}

// POST /api/v1/orders - Create a new order (Checkout)
ordersRouter.post('/', authenticate, async (req, res) => {
  const customerId = req.user?.userId;
  if (!customerId) return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);

  const { items, garageId, offerCode, paymentMethod, checkoutSessionId } = req.body;
  
  if (!items || !items.length || !garageId) {
    return error(res, 'Missing required fields', 'BAD_REQUEST', 400);
  }

  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 0. Idempotency Check: if checkoutSessionId supplied or an active unpaid order exists for this exact checkout session
    if (checkoutSessionId) {
      const existingOrderRes = await client.query(
        `SELECT o.*, p_pay.method as payment_method 
         FROM orders o 
         LEFT JOIN payments p_pay ON o.id = p_pay.order_id
         WHERE o.customer_id = $1 AND o.garage_id = $2 AND o.payment_status = 'PENDING'
           AND o.shipping_address->>'checkoutSessionId' = $3
         ORDER BY o.created_at DESC LIMIT 1`,
        [customerId, garageId, checkoutSessionId]
      );

      if (existingOrderRes.rows.length > 0) {
        const existingOrder = existingOrderRes.rows[0];
        await client.query('COMMIT');
        return success(res, {
          orderId: existingOrder.id,
          orderNumber: existingOrder.order_number,
          total: parseFloat(existingOrder.total.toString()),
          subtotal: parseFloat(existingOrder.subtotal.toString()),
          tax: parseFloat(existingOrder.tax.toString()),
          shippingCost: parseFloat(existingOrder.shipping_cost.toString()),
          currency: existingOrder.currency,
          paymentMethod: existingOrder.payment_method || paymentMethod,
          paymentStatus: existingOrder.payment_status,
          status: existingOrder.status,
          reused: true
        });
      }
    }

    // 1. Calculate totals and check inventory
    let subtotal = 0;
    const processedItems = [];
    
    for (const item of items) {
      // Check inventory for this garage and product
      const invResult = await client.query(
        `SELECT gi.id, gi.qty_available, COALESCE(gi.price, p.price) as price, p.name 
         FROM garage_inventory gi 
         JOIN products p ON gi.product_id = p.id 
         WHERE gi.product_id = $1 AND gi.garage_id = $2`,
        [item.productId, garageId]
      );
      
      if (invResult.rows.length === 0) {
        throw new Error(`Product ${item.productId} not available at this garage`);
      }
      
      const inventory = invResult.rows[0];
      if (inventory.qty_available < item.quantity) {
        throw new Error(`Insufficient stock for ${inventory.name}`);
      }
      
      const unitPrice = parseFloat(inventory.price);
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;
      
      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal
      });
    }
    
    let discountApplied = 0;
    let offerId: string | null = null;
    
    if (offerCode) {
      try {
        const offerResult = await validateOffer(offerCode, customerId, subtotal, garageId);
        offerId = offerResult.offerId;
        const discountPercentage = offerResult.discount;
        discountApplied = subtotal * (discountPercentage / 100);
      } catch (e: any) {
        console.warn(`Failed to apply offer ${offerCode}: ${e.message}`);
      }
    }

    const discountedSubtotal = subtotal - discountApplied;
    const tax = Math.round(discountedSubtotal * 0.18 * 100) / 100; // 18% tax on discounted amount
    const shippingCost = 0;
    
    const total = Math.round((discountedSubtotal + tax + shippingCost) * 100) / 100;
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const pickupDetails = { checkoutSessionId: checkoutSessionId || undefined, pickupGarageId: garageId };

    // Currency belongs to the garage, never the browser or customer locale.
    const garageRes = await client.query(
      `SELECT name, address, city, location, COALESCE(business_currency, pricing_currency, 'INR') AS currency
       FROM garages WHERE id = $1 AND approval_status IN ('active', 'approved')`,
      [garageId]
    );
    if (garageRes.rows.length === 0) throw new Error('Garage is not available for orders');
    const currency = garageRes.rows[0].currency;

    // 2. Create the Order (Default status: PENDING_ACCEPTANCE, payment_status: PENDING)
    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, garage_id, order_number, status, payment_status, subtotal, shipping_cost, tax, total, currency, fulfillment_mode, shipping_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [customerId, garageId, orderNumber, 'PENDING_ACCEPTANCE', 'PENDING', subtotal, shippingCost, tax, total, currency, 'inHouse', pickupDetails]
    );
    const orderId = orderResult.rows[0].id;
    
    // 3. Record offer redemption
    if (offerId && discountApplied > 0) {
      await recordOfferRedemption(offerId, customerId, undefined, discountApplied);
    }
    
    // 4. Create Order Items
    for (const pItem of processedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, pItem.productId, pItem.quantity, pItem.unitPrice, pItem.totalPrice]
      );
    }
    
    // 5. If COD, create payment record
    if (paymentMethod === 'cod') {
      await client.query(
        `INSERT INTO payments (customer_user_id, order_id, method, transaction_id, amount, currency, status)
         VALUES ($1, $2, 'cod', $3, $4, $5, 'created')`,
        [customerId, orderId, `cod_${orderId}`, total, currency]
      );
      // Deduct inventory immediately for COD
      const itemsRes = await client.query(`SELECT * FROM order_items WHERE order_id = $1`, [orderId]);
      for (const item of itemsRes.rows) {
      const stockUpdate = await client.query(
        `UPDATE garage_inventory SET qty_available = qty_available - $1, updated_at = NOW()
           WHERE product_id = $2 AND garage_id = $3 AND qty_available >= $1`,
          [item.quantity, item.product_id, garageId]
        );
        if (stockUpdate.rowCount !== 1) throw new Error(`Insufficient stock for product ${item.product_id}`);
      }
    }
    
    await client.query('COMMIT');
    await NotificationsService.createNotification({
      garageId,
      type: 'Order',
      title: 'New order received',
      description: `Order ${orderNumber} has been placed and is awaiting acceptance by the garage.`
    }).catch(err => console.error('Order notification failed:', err));
    await NotificationsService.createNotification({
      userId: customerId,
      type: 'Order',
      title: 'Order Placed',
      description: `Your order ${orderNumber} has been placed successfully for collection from the selected garage.`
    }).catch(err => console.error('Order notification failed:', err));
    return success(res, { 
      orderId, 
      orderNumber, 
      total: parseFloat(total.toString()), 
      subtotal: parseFloat(subtotal.toString()), 
      tax: parseFloat(tax.toString()), 
      shippingCost: parseFloat(shippingCost.toString()), 
      discountApplied: parseFloat(discountApplied.toString()),
      currency,
      paymentMethod,
      paymentStatus: 'PENDING',
      status: 'PENDING_ACCEPTANCE'
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Order creation error:', err);
    return error(res, err.message || 'Failed to create order', 'ORDER_ERROR', 400);
  } finally {
    client.release();
  }
});

// POST /api/v1/orders/:id/pay - Create Razorpay order for inventory order
ordersRouter.post('/:id/pay', authenticate, async (req, res) => {
  const customerId = req.user?.userId;
  const orderId = req.params.id;
  
  if (!customerId) return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);

  try {
    const pool = getDbPool();
    const orderRes = await pool.query(`SELECT * FROM orders WHERE id = $1 AND customer_id = $2`, [orderId, customerId]);
    if (orderRes.rows.length === 0) return error(res, 'Order not found', 'NOT_FOUND', 404);
    
    const order = orderRes.rows[0];
    if (order.payment_status === 'PAID') {
      return error(res, 'Order is already paid', 'BAD_REQUEST', 400);
    }
    
    const amountInPaise = Math.round(parseFloat(order.total) * 100);
    const intentToken = `order_intent_${orderId}`;
    const existingIntent = await pool.query(
      `SELECT provider_order_id FROM payments WHERE order_id = $1 AND status = 'created' AND provider_order_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`, [orderId]
    );
    if (existingIntent.rows[0]?.provider_order_id) {
      return success(res, { providerOrderId: existingIntent.rows[0].provider_order_id, amount: amountInPaise, currency: order.currency });
    }
    await pool.query(
      `INSERT INTO payments (customer_user_id, order_id, method, transaction_id, amount, currency, status)
       VALUES ($1, $2, 'razorpay', $3, $4, $5, 'created') ON CONFLICT (transaction_id) DO NOTHING`,
      [customerId, orderId, intentToken, parseFloat(order.total), order.currency]
    );
    
    const rzpOrder = await getRazorpayClient().orders.create({
      amount: amountInPaise,
      currency: order.currency,
      receipt: order.order_number,
      notes: { order_id: order.id }
    });
    
    // Record payment intent
    await pool.query(
      `UPDATE payments SET provider_order_id = $1, transaction_id = $1
       WHERE order_id = $2 AND transaction_id = $3 AND status = 'created'`,
      [rzpOrder.id, orderId, intentToken]
    );
    
    return success(res, { providerOrderId: rzpOrder.id, amount: amountInPaise, currency: order.currency });
  } catch (err: any) {
    console.error('Razorpay order creation error:', err);
    return error(res, err?.error?.description || err?.message || 'Failed to initialize payment', 'PAYMENT_INIT_ERROR', 500);
  }
});

// POST /api/v1/orders/verify-payment - Verify inventory order payment
ordersRouter.post('/verify-payment', authenticate, async (req, res) => {
  const { providerOrderId, providerPaymentId, providerSignature, orderId } = req.body;
  const customerId = req.user?.userId;
  
  if (!providerOrderId || !providerPaymentId || !providerSignature || !orderId) {
    return error(res, 'Missing payment details', 'BAD_REQUEST', 400);
  }
  
  try {
    // 1. Verify Signature
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!secret) return error(res, 'Payment provider is not configured', 'CONFIGURATION_ERROR', 500);
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest('hex');
      
    if (generatedSignature !== providerSignature) {
      return error(res, 'Invalid payment signature', 'PAYMENT_VERIFICATION_FAILED', 400);
    }
    
    const pool = getDbPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(
        `SELECT * FROM orders WHERE id = $1 AND customer_id = $2 FOR UPDATE`,
        [orderId, customerId]
      );
      if (orderRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return error(res, 'Order not found or unauthorized', 'NOT_FOUND', 404);
      }
      if (orderRes.rows[0].payment_status === 'PAID') {
        await client.query('ROLLBACK');
        return success(res, { verified: true, orderId, paymentStatus: 'PAID' });
      }
      
      // Bind the provider payment exactly once. A retry must not overwrite a
      // different provider payment for the same local intent.
      await client.query(
        `UPDATE payments SET status = 'succeeded', provider_payment_id = $1, updated_at = NOW()
         WHERE order_id = $3 AND transaction_id = $2 AND status <> 'succeeded'`,
        [providerPaymentId, providerOrderId, orderId]
      );
      
      // Update Order: payment_status = PAID, status = PENDING_ACCEPTANCE (do NOT auto accept!)
      const paidOrderRes = await client.query(
        `UPDATE orders SET payment_status = 'PAID', status = 'PENDING_ACCEPTANCE', updated_at = NOW()
         WHERE id = $1 AND customer_id = $2 AND payment_status = 'PENDING' RETURNING *`,
        [orderId, customerId]
      );
      const order = paidOrderRes.rows[0];
      if (!order) throw new Error('Order payment state changed concurrently');
      
      // Deduct inventory
      const itemsRes = await client.query(`SELECT * FROM order_items WHERE order_id = $1`, [orderId]);
      for (const item of itemsRes.rows) {
        const stockUpdate = await client.query(
          `UPDATE garage_inventory SET qty_available = qty_available - $1, updated_at = NOW()
           WHERE product_id = $2 AND garage_id = $3 AND qty_available >= $1`,
          [item.quantity, item.product_id, order.garage_id]
        );
        if (stockUpdate.rowCount !== 1) throw new Error(`Insufficient stock for product ${item.product_id}`);
      }
      
      // Generate Invoice
      const invoiceNumber = `INV-ORD-${Date.now()}`;
      await client.query(
        `INSERT INTO invoices (order_id, invoice_number, subtotal, tax_amount, total_amount, currency)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, invoiceNumber, order.subtotal, order.tax, order.total, order.currency]
      );
      
      await client.query('COMMIT');
      return success(res, { 
        verified: true, 
        orderId: order.id,
        orderNumber: order.order_number,
        transactionId: providerPaymentId,
        paymentMethod: 'online',
        paymentStatus: 'PAID',
        status: 'PENDING_ACCEPTANCE',
        amount: parseFloat(order.total),
        currency: order.currency
      });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('Payment verification error:', err);
    return error(res, 'Failed to verify payment', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// GET /api/v1/orders/garage - Get all orders for the authenticated garage
ordersRouter.get('/garage', authenticate, requireRole(['garage', 'admin']), async (req, res) => {
  const userId = req.user?.userId;
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '50'), 10) || 50));
  const pool = getDbPool();
  try {
    // Get garage ID for user
    const garageRes = await pool.query('SELECT id FROM garages WHERE owner_user_id = $1', [userId]);
    if (garageRes.rows.length === 0) return error(res, 'Garage not found for this user', 'NOT_FOUND', 404);
    const garageId = garageRes.rows[0].id;

    const ordersRes = await pool.query(`
      SELECT o.*, g.name as garage_name, g.address as garage_address, g.city as garage_city, g.location as garage_location,
        o.payment_status as payment_status,
        COALESCE(p_pay.method, 'online') as payment_method,
        p_pay.provider_payment_id as payment_transaction_id,
        json_agg(json_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'name', p.name
        )) as items,
        da.status as delivery_status,
        da.delivery_agent_id
      FROM orders o
      JOIN garages g ON o.garage_id = g.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN payments p_pay ON o.id = p_pay.order_id
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      WHERE o.garage_id = $1
      GROUP BY o.id, g.id, da.id, p_pay.method, p_pay.provider_payment_id
      ORDER BY o.created_at DESC
      LIMIT ${limit}
    `, [garageId]);

    return success(res, ordersRes.rows);
  } catch (err) {
    console.error('Fetch garage orders error', err);
    return error(res, 'Failed to fetch orders', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// PUT /api/v1/orders/:id/status - Update order fulfillment status
ordersRouter.put('/:id/status', authenticate, requireRole(['garage', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { status: requestedStatus } = req.body;
  const userId = req.user?.userId;

  if (!requestedStatus) {
    return error(res, 'Status is required', 'BAD_REQUEST', 400);
  }

  try {
    const pool = getDbPool();

    // Check if order exists and verify garage ownership
    const checkRes = await pool.query(`
      SELECT o.id, o.status, o.payment_status, g.owner_user_id
      FROM orders o 
      JOIN garages g ON o.garage_id = g.id 
      WHERE o.id = $1
    `, [id]);

    if (checkRes.rows.length === 0) {
      return error(res, 'Order not found', 'NOT_FOUND', 404);
    }

    const order = checkRes.rows[0];

    const isAdmin = req.user?.roles?.includes('admin');
    if (!isAdmin && order.owner_user_id !== userId) {
      return error(res, 'Unauthorized: Garage does not own this order', 'FORBIDDEN', 403);
    }

    // Canonical pickup lifecycle, with aliases accepted only for safe rollout.
    const statusMap: Record<string, string> = {
      'ACCEPTED': 'ACCEPTED',
      'READY_FOR_COLLECTION': 'READY_FOR_COLLECTION',
      'READYFORCOLLECTION': 'READY_FOR_COLLECTION',
      'COLLECTED': 'COLLECTED',
      'CANCELLED': 'CANCELLED'
    };

    const targetStatus = statusMap[String(requestedStatus).toUpperCase().replace(/\s+/g, '_')];
    if (!targetStatus) return error(res, 'Invalid order status', 'BAD_REQUEST', 400);

    const allowedTransitions: Record<string, string[]> = {
      PENDING_ACCEPTANCE: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['READY_FOR_COLLECTION', 'CANCELLED'],
      READY_FOR_COLLECTION: ['COLLECTED'],
      COLLECTED: [],
      CANCELLED: []
    };
    if (!(allowedTransitions[order.status] || []).includes(targetStatus)) {
      return error(res, `Order cannot move from ${order.status} to ${targetStatus}`, 'INVALID_STATUS_TRANSITION', 400);
    }
    if (targetStatus === 'COLLECTED' && order.payment_status !== 'PAID') return error(res, 'Payment must be confirmed before collection', 'BAD_REQUEST', 400);

    const updateRes = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [targetStatus, id]
    );

    const customerResult = await pool.query(`SELECT o.customer_id, o.order_number, g.name AS garage_name, g.city
                                              FROM orders o JOIN garages g ON g.id = o.garage_id WHERE o.id = $1`, [id]);
    const statusLabel = targetStatus === 'ACCEPTED' ? 'Received by Garage' : targetStatus === 'READY_FOR_COLLECTION' ? 'Ready for Collection' : targetStatus.charAt(0) + targetStatus.slice(1).toLowerCase();
    await NotificationsService.createNotification({
      userId: customerResult.rows[0]?.customer_id,
      type: 'Order',
      title: `Order ${statusLabel}`,
      description: `Your order ${customerResult.rows[0]?.order_number || ''} status is now ${statusLabel}${targetStatus === 'READY_FOR_COLLECTION' ? ` at ${customerResult.rows[0]?.garage_name || 'the garage'}${customerResult.rows[0]?.city ? `, ${customerResult.rows[0].city}` : ''}` : ''}.`
    }).catch(err => console.error('Order status notification failed:', err));
    return success(res, updateRes.rows[0]);
  } catch (err) {
    console.error('Update order status error', err);
    return error(res, 'Failed to update order status', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// POST /api/v1/orders/:id/confirm-cash - Garage confirms cash receipt for COD order
ordersRouter.post('/:id/confirm-cash', authenticate, requireRole(['garage', 'admin']), async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify ownership and order state
    const orderRes = await client.query(`
      SELECT o.id, o.garage_id, o.status, o.payment_status, g.owner_user_id
      FROM orders o
      JOIN garages g ON o.garage_id = g.id
      WHERE o.id = $1
    `, [id]);

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return error(res, 'Order not found', 'NOT_FOUND', 404);
    }

    const order = orderRes.rows[0];

    const isAdmin = req.user?.roles?.includes('admin');
    if (!isAdmin && order.owner_user_id !== userId) {
      await client.query('ROLLBACK');
      return error(res, 'Unauthorized: Garage does not own this order', 'FORBIDDEN', 403);
    }

    if (order.status !== 'READY_FOR_COLLECTION') {
      await client.query('ROLLBACK');
      return error(res, 'Cash can only be confirmed when the order is ready for collection', 'BAD_REQUEST', 400);
    }

    // Update payment_status to PAID
    await client.query(
      `UPDATE orders SET payment_status = 'PAID', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Update payments table status to succeeded
    await client.query(
      `UPDATE payments SET status = 'succeeded', updated_at = NOW() WHERE order_id = $1`,
      [id]
    );

    await client.query('COMMIT');
    return success(res, { confirmed: true, orderId: id, paymentStatus: 'PAID', status: order.status });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Confirm cash error:', err);
    return error(res, err.message || 'Failed to confirm cash receipt', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    client.release();
  }
});

// GET /api/v1/orders/customer/me - Get all orders for the authenticated customer
ordersRouter.get('/customer/me', authenticate, async (req, res) => {
  const customerId = req.user?.userId;
  if (!customerId) return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);

  const pool = getDbPool();
  try {
    const ordersRes = await pool.query(`
      SELECT o.*, g.name as garage_name, g.address as garage_address, g.city as garage_city, g.location as garage_location,
        o.payment_status as payment_status,
        COALESCE(p_pay.method, 'online') as payment_method,
        p_pay.provider_payment_id as payment_transaction_id,
        json_agg(json_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'name', p.name
        )) as items,
        da.status as delivery_status
      FROM orders o
      JOIN garages g ON o.garage_id = g.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN payments p_pay ON o.id = p_pay.order_id
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      WHERE o.customer_id = $1
      GROUP BY o.id, g.id, da.id, p_pay.method, p_pay.provider_payment_id
      ORDER BY o.created_at DESC
    `, [customerId]);

    return success(res, ordersRes.rows);
  } catch (err) {
    console.error('Fetch customer orders error', err);
    return error(res, 'Failed to fetch customer orders', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// GET /api/v1/orders/:id - Get single order details by ID
ordersRouter.get('/:id', authenticate, async (req, res) => {
  const customerId = req.user?.userId;
  const { id } = req.params;
  if (!customerId) return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);

  const pool = getDbPool();
  try {
    const ordersRes = await pool.query(`
      SELECT o.*, 
        g.name as garage_name, g.address as garage_address, g.city as garage_city, g.location as garage_location,
        o.payment_status as payment_status,
        COALESCE(p_pay.method, 'online') as payment_method,
        p_pay.provider_payment_id as payment_transaction_id,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price,
              'name', p.name,
              'image', p.image
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items,
        da.status as delivery_status
      FROM orders o
      LEFT JOIN garages g ON o.garage_id = g.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN payments p_pay ON o.id = p_pay.order_id
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      WHERE o.id = $1 AND ($3::boolean = TRUE OR o.customer_id = $2 OR g.owner_user_id = $2)
      GROUP BY o.id, g.id, p_pay.method, p_pay.provider_payment_id, da.status
    `, [id, customerId, req.user?.roles?.includes('admin') || false]);

    if (ordersRes.rows.length === 0) {
      return error(res, 'Order not found or unauthorized', 'NOT_FOUND', 404);
    }

    return success(res, ordersRes.rows[0]);
  } catch (err) {
    console.error('Fetch order details error', err);
    return error(res, 'Failed to fetch order details', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// GET /api/v1/orders/admin/filter-options - Get live order filter options
ordersRouter.get('/admin/filter-options', authenticate, requireRole(['admin']), async (_req, res) => {
  const pool = getDbPool();
  try {
    const garages = await pool.query(
      `SELECT g.id, g.name
       FROM garages g
       WHERE g.name IS NOT NULL AND g.approval_status != 'deleted'
       ORDER BY g.name`
    );
    return success(res, {
      garages: garages.rows,
    });
  } catch (err) {
    console.error('Fetch admin order filter options error', err);
    return error(res, 'Failed to fetch order filter options', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// GET /api/v1/orders/admin/all - Get ALL orders for admin
ordersRouter.get('/admin/all', authenticate, requireRole(['admin']), async (req, res) => {
  const pool = getDbPool();
  try {
    const { search, garageId, customer, dateFrom, dateTo, collectionStatus } = req.query;
    
    let queryStr = `
      SELECT o.*, 
        o.payment_status as payment_status,
        COALESCE(p_pay.method, 'online') as payment_method,
        p_pay.provider_payment_id as payment_transaction_id,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'name', p.name
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items,
        g.name as garage_name,
        u.name as customer_name,
        CASE WHEN o.status = 'COLLECTED' THEN 'COLLECTED' WHEN o.status = 'READY_FOR_COLLECTION' THEN 'READY' ELSE 'PENDING' END as collection_status
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN garages g ON o.garage_id = g.id
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN payments p_pay ON o.id = p_pay.order_id
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (req.query.status && req.query.status !== 'All') {
      params.push(req.query.status as string);
      conditions.push(`o.status = $${params.length}`);
    }
    
    if (search) {
      const q = `%${(search as string).toLowerCase()}%`;
      params.push(q);
      conditions.push(`LOWER(o.order_number) LIKE $${params.length}`);
    }
    if (garageId) { params.push(garageId); conditions.push(`o.garage_id = $${params.length}`); }
    if (customer) { params.push(`%${String(customer).toLowerCase()}%`); conditions.push(`LOWER(u.name) LIKE $${params.length}`); }
    if (dateFrom) { params.push(dateFrom); conditions.push(`o.created_at >= $${params.length}::date`); }
    if (dateTo) { params.push(dateTo); conditions.push(`o.created_at < ($${params.length}::date + INTERVAL '1 day')`); }
    if (collectionStatus && collectionStatus !== 'All') {
      const statusMap: Record<string, string[]> = { Ready: ['READY_FOR_COLLECTION'], Collected: ['COLLECTED'], Pending: ['PENDING_ACCEPTANCE', 'ACCEPTED'] };
      const statuses = statusMap[String(collectionStatus)];
      if (statuses) { params.push(statuses); conditions.push(`o.status = ANY($${params.length}::varchar[])`); }
    }
    
    if (conditions.length > 0) {
      queryStr += ` WHERE ` + conditions.join(' AND ');
    }
    
    queryStr += `
      GROUP BY o.id, g.name, u.name, p_pay.method, p_pay.provider_payment_id
      ORDER BY o.created_at DESC
    `;

    const ordersRes = await pool.query(queryStr, params);

    return success(res, ordersRes.rows);
  } catch (err) {
    console.error('Fetch admin orders error', err);
    return error(res, 'Failed to fetch admin orders', 'INTERNAL_SERVER_ERROR', 500);
  }
});
