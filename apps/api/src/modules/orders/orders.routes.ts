import { Router } from 'express';
import { getDbPool } from '../../config/database';
import { success, error } from '../../utils/response';
import { authenticate, requireRole } from '../../middleware/auth';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { validateOffer, recordOfferRedemption } from '../offers/offers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { commitOrderInventory, markProductOrderPaid, releaseOrderInventory, reserveOrderInventory } from './order-inventory.service';
import { fetchRazorpayPayment, issueRazorpayRefund } from '../payments/razorpay.service';
import { findCheckoutOrder, insertProductOrder } from './order-checkout.service';

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

  const { items, garageId, offerCode, paymentMethod } = req.body;
  const checkoutSessionId = String(req.body?.checkoutSessionId || req.get('Idempotency-Key') || '').trim();
  
  if (!items || !items.length || !garageId) {
    return error(res, 'Missing required fields', 'BAD_REQUEST', 400);
  }
  if (!checkoutSessionId || checkoutSessionId.length > 255) {
    return error(res, 'A valid checkout session ID is required', 'BAD_REQUEST', 400);
  }

  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Serialize a checkout key in PostgreSQL so separate API instances cannot
    // both create an order for the same customer/session.
    {
      const existingOrder = await findCheckoutOrder(client, customerId, garageId, checkoutSessionId);
      if (existingOrder) {
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
         WHERE gi.product_id = $1 AND gi.garage_id = $2 AND gi.is_active IS TRUE`,
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
    const orderId = await insertProductOrder(client, {
      customerId,
      garageId,
      orderNumber,
      subtotal,
      shippingCost,
      tax,
      total,
      currency,
      shippingAddress: pickupDetails,
      checkoutSessionId: checkoutSessionId || null,
      reservationExpiresAt: paymentMethod === 'cod' ? null : new Date(Date.now() + 15 * 60 * 1000),
    });
    
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
        `INSERT INTO payments (payer_user_id, order_id, provider, provider_intent_id, amount, currency, status)
         VALUES ($1, $2, 'cod', $3, $4, $5, 'created')`,
        [customerId, orderId, `cod_${orderId}`, total, currency]
      );
    }

    // Online and COD checkouts share the same atomic PostgreSQL reservation.
    await reserveOrderInventory(client, garageId, processedItems.map(item => ({
      product_id: item.productId,
      quantity: item.quantity
    })));
    
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

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderRes = await client.query(`SELECT * FROM orders WHERE id = $1 AND customer_id = $2 FOR UPDATE`, [orderId, customerId]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return error(res, 'Order not found', 'NOT_FOUND', 404);
    }
    const order = orderRes.rows[0];
    if (['PAID', 'REFUND_PENDING', 'REFUNDED'].includes(order.payment_status) || order.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return error(res, 'This order cannot be paid in its current state', 'BAD_REQUEST', 400);
    }

    const amountInPaise = Math.round(Number(order.total) * 100);
    if (order.inventory_status === 'RESERVED' && order.reservation_expires_at && new Date(order.reservation_expires_at).getTime() <= Date.now()) {
      await releaseOrderInventory(client, orderId, ['RESERVED']);
      await client.query(`UPDATE orders SET payment_status = 'FAILED' WHERE id = $1`, [orderId]);
      await client.query(`UPDATE payments SET status = 'failed', updated_at = NOW() WHERE order_id = $1 AND status = 'created'`, [orderId]);
      order.inventory_status = 'RELEASED';
      order.payment_status = 'FAILED';
    }
    const existingIntent = await client.query(
      `SELECT provider_order_id FROM payments WHERE order_id = $1 AND status = 'created' AND provider_order_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`, [orderId]
    );
    if (existingIntent.rows[0]?.provider_order_id) {
      await client.query('COMMIT');
      return success(res, { providerOrderId: existingIntent.rows[0].provider_order_id, amount: amountInPaise, currency: order.currency });
    }

    if (order.inventory_status === 'RELEASED') {
      const lines = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [orderId]);
      await reserveOrderInventory(client, order.garage_id, lines.rows);
      await client.query(
        `UPDATE orders SET inventory_status = 'RESERVED', reservation_expires_at = NOW() + INTERVAL '15 minutes',
           payment_status = 'PENDING', updated_at = NOW() WHERE id = $1`, [orderId]
      );
    }

    await client.query(
      `UPDATE orders SET reservation_expires_at = NOW() + INTERVAL '15 minutes', updated_at = NOW()
       WHERE id = $1 AND inventory_status = 'RESERVED'`, [orderId]
    );

    const rzpOrder = await getRazorpayClient().orders.create({
      amount: amountInPaise,
      currency: order.currency,
      receipt: order.order_number,
      notes: { order_id: order.id }
    });
    await client.query(
      `INSERT INTO payments (payer_user_id, order_id, provider, provider_intent_id, provider_order_id, amount, currency, status)
       VALUES ($1, $2, 'razorpay', $3, $3, $4, $5, 'created')`,
      [customerId, orderId, rzpOrder.id, Number(order.total), order.currency]
    );
    await client.query('COMMIT');
    return success(res, { providerOrderId: rzpOrder.id, amount: amountInPaise, currency: order.currency });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Razorpay order creation error:', err);
    return error(res, err?.error?.description || err?.message || 'Failed to initialize payment', 'PAYMENT_INIT_ERROR', 500);
  } finally {
    client.release();
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
    // 1. Verify signature, then confirm the provider-side captured amount and currency.
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!secret) return error(res, 'Payment provider is not configured', 'CONFIGURATION_ERROR', 500);
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest('hex');
      
    if (generatedSignature !== providerSignature) {
      return error(res, 'Invalid payment signature', 'PAYMENT_VERIFICATION_FAILED', 400);
    }

    const providerPayment = await fetchRazorpayPayment(providerPaymentId);
    if (providerPayment.order_id !== providerOrderId || providerPayment.status !== 'captured') {
      return error(res, 'Payment is not captured for this order', 'PAYMENT_VERIFICATION_FAILED', 400);
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
      const paymentResult = await markProductOrderPaid(
        client,
        orderId,
        providerOrderId,
        providerPaymentId,
        Number(providerPayment.amount),
        String(providerPayment.currency)
      );
      await client.query('COMMIT');
      if (paymentResult.status !== 'PAID') {
        return error(res, 'Payment was captured after its stock reservation expired. It is held for refund reconciliation.', 'REFUND_RECONCILIATION_REQUIRED', 409);
      }
      const order = paymentResult.order;
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
        COALESCE(p_pay.provider, 'online') as payment_method,
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
      LEFT JOIN LATERAL (SELECT provider, provider_payment_id FROM payments WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) p_pay ON TRUE
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      WHERE o.garage_id = $1
      GROUP BY o.id, g.id, da.id, p_pay.provider, p_pay.provider_payment_id
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
ordersRouter.post('/:id/refund', authenticate, requireRole(['admin']), async (req, res) => {
  const pool = getDbPool();
  const client = await pool.connect();
  let refundPayment: any;
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT o.id, o.payment_status, o.total, p.id AS payment_id, p.provider, p.provider_payment_id, p.provider_refund_id, p.status AS provider_status
       FROM orders o JOIN payments p ON p.order_id = o.id
       WHERE o.id = $1 ORDER BY CASE WHEN p.status IN ('refund_pending', 'succeeded') THEN 0 ELSE 1 END, p.created_at DESC LIMIT 1 FOR UPDATE OF o, p`,
      [req.params.id]
    );
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return error(res, 'Product order payment not found', 'NOT_FOUND', 404);
    }
    const order = result.rows[0];
    if (order.payment_status === 'REFUNDED' || order.provider_status === 'refunded') {
      await client.query('COMMIT');
      return success(res, { refunded: true, alreadyProcessed: true });
    }
    if ((order.provider_status === 'refund_pending' || order.payment_status === 'REFUND_PENDING') && order.provider_refund_id) {
      await client.query('COMMIT');
      return success(res, { refundPending: true, message: 'Refund is already being reconciled.' });
    }
    const capturedPaymentNeedsReconciliation = order.provider_status === 'refund_pending' &&
      !order.provider_refund_id && ['REFUND_PENDING', 'PAID'].includes(order.payment_status);
    if (order.provider === 'cod' || !order.provider_payment_id ||
        (!capturedPaymentNeedsReconciliation && (order.provider_status !== 'succeeded' || order.payment_status !== 'PAID'))) {
      await client.query('ROLLBACK');
      return error(res, 'Only captured, paid online product orders can be refunded here', 'BAD_REQUEST', 400);
    }
    refundPayment = order;
    await client.query(`UPDATE payments SET status = 'refund_pending', refund_reason = $1, updated_at = NOW() WHERE id = $2`, [req.body?.reason || 'Product order refund', order.payment_id]);
    if (order.payment_status === 'PAID') {
      await client.query(`UPDATE orders SET payment_status = 'REFUND_PENDING', updated_at = NOW() WHERE id = $1`, [order.id]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Product order refund setup failed:', err);
    return error(res, 'Failed to start product order refund', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    client.release();
  }

  try {
    const refund = await issueRazorpayRefund(
      refundPayment.provider_payment_id,
      Math.round(Number(refundPayment.total) * 100)
    );
    const resultClient = await pool.connect();
    let resultingOrderPaymentStatus = refundPayment.payment_status;
    try {
      await resultClient.query('BEGIN');
      await resultClient.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [refundPayment.id]);
      const processed = refund.status === 'processed';
      await resultClient.query(
        `UPDATE payments SET status = $1, provider_refund_id = $2, updated_at = NOW() WHERE id = $3 AND status = 'refund_pending'`,
        [processed ? 'refunded' : 'refund_pending', refund.id, refundPayment.payment_id]
      );
      const remainingSuccessfulPayment = await resultClient.query(
        `SELECT id FROM payments WHERE order_id = $1 AND status = 'succeeded' LIMIT 1`, [refundPayment.id]
      );
      if (processed && remainingSuccessfulPayment.rowCount === 0) {
        await resultClient.query(`UPDATE orders SET payment_status = 'REFUNDED', updated_at = NOW() WHERE id = $1`, [refundPayment.id]);
        await releaseOrderInventory(resultClient, refundPayment.id);
        resultingOrderPaymentStatus = 'REFUNDED';
      } else if (processed) {
        await resultClient.query(`UPDATE orders SET payment_status = 'PAID', updated_at = NOW() WHERE id = $1`, [refundPayment.id]);
        resultingOrderPaymentStatus = 'PAID';
      } else if (!processed && refundPayment.payment_status === 'PAID') {
        resultingOrderPaymentStatus = 'REFUND_PENDING';
      }
      await resultClient.query('COMMIT');
    } catch (err) {
      await resultClient.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      resultClient.release();
    }
    return success(res, { refund, paymentStatus: resultingOrderPaymentStatus });
  } catch (err) {
    const failureClient = await pool.connect();
    try {
      await failureClient.query('BEGIN');
      await failureClient.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [refundPayment.id]);
      await failureClient.query(`UPDATE payments SET status = 'refund_failed', updated_at = NOW() WHERE id = $1 AND status = 'refund_pending'`, [refundPayment.payment_id]);
      const remainingSuccessfulPayment = await failureClient.query(
        `SELECT id FROM payments WHERE order_id = $1 AND status = 'succeeded' LIMIT 1`, [refundPayment.id]
      );
      await failureClient.query(
        `UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2 AND payment_status = 'REFUND_PENDING'`,
        [remainingSuccessfulPayment.rowCount ? 'PAID' : 'REFUND_FAILED', refundPayment.id]
      );
      await failureClient.query('COMMIT');
    } finally {
      failureClient.release();
    }
    console.error('Product order refund failed:', err);
    return error(res, 'Refund could not be initiated; reconcile this captured payment with Razorpay.', 'REFUND_FAILED', 502);
  }
});

ordersRouter.put('/:id/status', authenticate, requireRole(['garage', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { status: requestedStatus } = req.body;
  const userId = req.user?.userId;

  if (!requestedStatus) {
    return error(res, 'Status is required', 'BAD_REQUEST', 400);
  }

  let client: any = null;
  try {
    const pool = getDbPool();
    client = await pool.connect();
    await client.query('BEGIN');

    // Lock the order so concurrent state changes cannot restore inventory twice.
    const checkRes = await client.query(`
      SELECT o.id, o.status, o.payment_status, o.inventory_status, g.owner_user_id
      FROM orders o JOIN garages g ON o.garage_id = g.id
      WHERE o.id = $1 FOR UPDATE OF o
    `, [id]);

    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return error(res, 'Order not found', 'NOT_FOUND', 404);
    }

    const order = checkRes.rows[0];

    const isAdmin = req.user?.roles?.includes('admin');
    if (!isAdmin && order.owner_user_id !== userId) {
      await client.query('ROLLBACK');
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
    if (!targetStatus) {
      await client.query('ROLLBACK');
      return error(res, 'Invalid order status', 'BAD_REQUEST', 400);
    }

    const allowedTransitions: Record<string, string[]> = {
      PENDING_ACCEPTANCE: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['READY_FOR_COLLECTION', 'CANCELLED'],
      READY_FOR_COLLECTION: ['COLLECTED'],
      COLLECTED: [],
      CANCELLED: []
    };
    if (!(allowedTransitions[order.status] || []).includes(targetStatus)) {
      await client.query('ROLLBACK');
      return error(res, `Order cannot move from ${order.status} to ${targetStatus}`, 'INVALID_STATUS_TRANSITION', 400);
    }
    if (targetStatus === 'COLLECTED' && order.payment_status !== 'PAID') {
      await client.query('ROLLBACK');
      return error(res, 'Payment must be confirmed before collection', 'BAD_REQUEST', 400);
    }

    if (targetStatus === 'CANCELLED') {
      await releaseOrderInventory(client, id);
      await client.query(`UPDATE payments SET status = 'failed', updated_at = NOW() WHERE order_id = $1 AND status = 'created'`, [id]);
      if (order.payment_status === 'PENDING') {
        await client.query(`UPDATE orders SET payment_status = 'FAILED' WHERE id = $1`, [id]);
      }
    }

    const updateRes = await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [targetStatus, id]
    );

    const customerResult = await client.query(`SELECT o.customer_id, o.order_number, g.name AS garage_name, g.city
                                              FROM orders o JOIN garages g ON g.id = o.garage_id WHERE o.id = $1`, [id]);
    await client.query('COMMIT');
    const statusLabel = targetStatus === 'ACCEPTED' ? 'Received by Garage' : targetStatus === 'READY_FOR_COLLECTION' ? 'Ready for Collection' : targetStatus.charAt(0) + targetStatus.slice(1).toLowerCase();
    await NotificationsService.createNotification({
      userId: customerResult.rows[0]?.customer_id,
      type: 'Order',
      title: `Order ${statusLabel}`,
      description: `Your order ${customerResult.rows[0]?.order_number || ''} status is now ${statusLabel}${targetStatus === 'READY_FOR_COLLECTION' ? ` at ${customerResult.rows[0]?.garage_name || 'the garage'}${customerResult.rows[0]?.city ? `, ${customerResult.rows[0].city}` : ''}` : ''}.`
    }).catch(err => console.error('Order status notification failed:', err));
    return success(res, updateRes.rows[0]);
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    console.error('Update order status error', err);
    return error(res, 'Failed to update order status', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    if (client) client.release();
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
      WHERE o.id = $1 FOR UPDATE OF o
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

    const cashPayment = await client.query(
      `SELECT id FROM payments WHERE order_id = $1 AND provider = 'cod' AND status IN ('created', 'succeeded') FOR UPDATE`,
      [id]
    );
    if (!cashPayment.rows.length) {
      await client.query('ROLLBACK');
      return error(res, 'This order does not have a pending cash-on-collection payment', 'BAD_REQUEST', 400);
    }
    await commitOrderInventory(client, id);

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
        COALESCE(p_pay.provider, 'online') as payment_method,
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
      LEFT JOIN LATERAL (SELECT provider, provider_payment_id FROM payments WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) p_pay ON TRUE
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      WHERE o.customer_id = $1
      GROUP BY o.id, g.id, da.id, p_pay.provider, p_pay.provider_payment_id
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
        COALESCE(p_pay.provider, 'online') as payment_method,
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
      LEFT JOIN LATERAL (SELECT provider, provider_payment_id FROM payments WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) p_pay ON TRUE
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      WHERE o.id = $1 AND ($3::boolean = TRUE OR o.customer_id = $2 OR g.owner_user_id = $2)
      GROUP BY o.id, g.id, da.id, p_pay.provider, p_pay.provider_payment_id, da.status
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
        COALESCE(p_pay.provider, 'online') as payment_method,
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
      LEFT JOIN LATERAL (SELECT provider, provider_payment_id FROM payments WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) p_pay ON TRUE
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
      GROUP BY o.id, g.name, u.name, p_pay.provider, p_pay.provider_payment_id
      ORDER BY o.created_at DESC
    `;

    const ordersRes = await pool.query(queryStr, params);

    return success(res, ordersRes.rows);
  } catch (err) {
    console.error('Fetch admin orders error', err);
    return error(res, 'Failed to fetch admin orders', 'INTERNAL_SERVER_ERROR', 500);
  }
});
