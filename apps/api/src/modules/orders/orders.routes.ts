import { Router } from 'express';
import { getDbPool } from '../../config/database';
import { success, error } from '../../utils/response';
import { authenticate, requireRole } from '../../middleware/auth';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { validateOffer, recordOfferRedemption } from '../offers/offers.service';

export const ordersRouter = Router();

// Initialize Razorpay
const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

// POST /api/v1/orders - Create a new order (Checkout)
ordersRouter.post('/', authenticate, async (req, res) => {
  const customerId = req.user?.userId;
  if (!customerId) return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);

  const { items, garageId, shippingAddress, offerCode, paymentMethod, checkoutSessionId } = req.body;
  
  if (!items || !items.length || !garageId || !shippingAddress) {
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
    const tax = discountedSubtotal * 0.18; // 18% tax on discounted amount
    const shippingCost = discountedSubtotal > 0 ? 10.0 : 0; // Flat shipping cost if cart not empty
    
    const total = discountedSubtotal + tax + shippingCost;
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Attach checkoutSessionId to shippingAddress for idempotency tracking
    const updatedShippingAddress = {
      ...shippingAddress,
      checkoutSessionId: checkoutSessionId || undefined
    };

    // Fetch garage location to set correct currency
    const garageRes = await client.query(`SELECT location->>'country' as country, city FROM garages WHERE id = $1`, [garageId]);
    let currency = 'INR';
    if (garageRes.rows.length > 0) {
      const c = (garageRes.rows[0].country || '').toLowerCase();
      if (c.includes('united states') || c === 'us') currency = 'USD';
      else if (c.includes('united arab emirates') || c === 'ae') currency = 'AED';
    }

    // 2. Create the Order (Default status: PENDING_ACCEPTANCE, payment_status: PENDING)
    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, garage_id, order_number, status, payment_status, subtotal, shipping_cost, tax, total, currency, fulfillment_mode, shipping_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [customerId, garageId, orderNumber, 'PENDING_ACCEPTANCE', 'PENDING', subtotal, shippingCost, tax, total, currency, 'inHouse', updatedShippingAddress]
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
    
    const rzpOrder = await rzp.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: order.order_number,
      notes: { order_id: order.id }
    });
    
    // Record payment intent
    await pool.query(
      `INSERT INTO payments (customer_user_id, order_id, method, transaction_id, provider_order_id, amount, currency, status)
       VALUES ($1, $2, 'razorpay', $3, $3, $4, 'INR', 'created')`,
      [customerId, orderId, rzpOrder.id, parseFloat(order.total)]
    );
    
    return success(res, { providerOrderId: rzpOrder.id, amount: amountInPaise, currency: 'INR' });
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
      
      // Update Payment
      await client.query(
        `UPDATE payments SET status = 'succeeded', provider_payment_id = $1, updated_at = NOW()
         WHERE order_id = $3 AND transaction_id = $2`,
        [providerPaymentId, providerOrderId, orderId]
      );
      
      // Update Order: payment_status = PAID, status = PENDING_ACCEPTANCE (do NOT auto accept!)
      const paidOrderRes = await client.query(
        `UPDATE orders SET payment_status = 'PAID', status = 'PENDING_ACCEPTANCE', updated_at = NOW() WHERE id = $1 AND customer_id = $2 AND payment_status = 'PENDING' RETURNING *`,
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
  const pool = getDbPool();
  try {
    // Get garage ID for user
    const garageRes = await pool.query('SELECT id FROM garages WHERE owner_user_id = $1', [userId]);
    if (garageRes.rows.length === 0) return error(res, 'Garage not found for this user', 'NOT_FOUND', 404);
    const garageId = garageRes.rows[0].id;

    const ordersRes = await pool.query(`
      SELECT o.*, 
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
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN payments p_pay ON o.id = p_pay.order_id
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      WHERE o.garage_id = $1
      GROUP BY o.id, da.id, p_pay.method, p_pay.provider_payment_id
      ORDER BY o.created_at DESC
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

    // Ownership check: authenticated user MUST be the garage owner
    if (order.owner_user_id !== userId) {
      return error(res, 'Unauthorized: Garage does not own this order', 'FORBIDDEN', 403);
    }

    // Normalize target status
    const statusMap: Record<string, string> = {
      'ACCEPTED': 'PACKING', // Accepting moves to PACKING
      'PACKING': 'PACKING',
      'SHIPPED': 'SHIPPED',
      'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
      'DELIVERED': 'DELIVERED',
      'CANCELLED': 'CANCELLED'
    };

    const targetStatus = statusMap[requestedStatus] || requestedStatus;

    // Enforce transition rules
    if (targetStatus === 'DELIVERED' && order.payment_status !== 'PAID') {
      return error(res, 'Payment must be confirmed before marking order as delivered', 'BAD_REQUEST', 400);
    }

    const updateRes = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [targetStatus, id]
    );

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

    if (order.owner_user_id !== userId) {
      await client.query('ROLLBACK');
      return error(res, 'Unauthorized: Garage does not own this order', 'FORBIDDEN', 403);
    }

    if (order.status !== 'OUT_FOR_DELIVERY') {
      await client.query('ROLLBACK');
      return error(res, 'Cash can only be confirmed when order is Out for Delivery', 'BAD_REQUEST', 400);
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
      SELECT o.*, 
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
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN payments p_pay ON o.id = p_pay.order_id
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      WHERE o.customer_id = $1
      GROUP BY o.id, da.id, p_pay.method, p_pay.provider_payment_id
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
        g.name as garage_name,
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
      WHERE o.id = $1 AND (o.customer_id = $2 OR g.owner_user_id = $2)
      GROUP BY o.id, g.name, p_pay.method, p_pay.provider_payment_id, da.status
    `, [id, customerId]);

    if (ordersRes.rows.length === 0) {
      return error(res, 'Order not found or unauthorized', 'NOT_FOUND', 404);
    }

    return success(res, ordersRes.rows[0]);
  } catch (err) {
    console.error('Fetch order details error', err);
    return error(res, 'Failed to fetch order details', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// GET /api/v1/orders/admin/all - Get ALL orders for admin
ordersRouter.get('/admin/all', authenticate, requireRole(['admin']), async (req, res) => {
  const pool = getDbPool();
  try {
    const ordersRes = await pool.query(`
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
        da.status as delivery_status,
        agent.name as delivery_agent_name
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN garages g ON o.garage_id = g.id
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN payments p_pay ON o.id = p_pay.order_id
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      LEFT JOIN users agent ON da.delivery_agent_id = agent.id
      GROUP BY o.id, da.id, g.name, u.name, agent.name, p_pay.method, p_pay.provider_payment_id
      ORDER BY o.created_at DESC
    `);

    return success(res, ordersRes.rows);
  } catch (err) {
    console.error('Fetch admin orders error', err);
    return error(res, 'Failed to fetch admin orders', 'INTERNAL_SERVER_ERROR', 500);
  }
});
