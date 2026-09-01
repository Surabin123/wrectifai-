import { Router } from 'express';
import { getDbPool } from '../../config/database';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import Razorpay from 'razorpay';
import crypto from 'crypto';

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

  const { items, garageId, shippingAddress } = req.body;
  
  if (!items || !items.length || !garageId || !shippingAddress) {
    return error(res, 'Missing required fields', 'BAD_REQUEST', 400);
  }

  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
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
    
    const tax = subtotal * 0.18; // 18% tax
    const shippingCost = 10.0; // Flat shipping cost
    const total = subtotal + tax + shippingCost;
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Fetch garage location to set correct currency
    const garageRes = await client.query(`SELECT location->>'country' as country, city FROM garages WHERE id = $1`, [garageId]);
    let currency = 'INR';
    if (garageRes.rows.length > 0) {
      const c = (garageRes.rows[0].country || '').toLowerCase();
      if (c.includes('united states') || c === 'us') currency = 'USD';
      else if (c.includes('united arab emirates') || c === 'ae') currency = 'AED';
    }

    // 2. Create the Order
    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, garage_id, order_number, status, subtotal, shipping_cost, tax, total, currency, fulfillment_mode, shipping_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [customerId, garageId, orderNumber, 'pendingPayment', subtotal, shippingCost, tax, total, currency, 'inHouse', shippingAddress]
    );
    const orderId = orderResult.rows[0].id;
    
    // 3. Create Order Items
    for (const pItem of processedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, pItem.productId, pItem.quantity, pItem.unitPrice, pItem.totalPrice]
      );
    }
    
    await client.query('COMMIT');
    return success(res, { orderId, orderNumber, total, subtotal, tax, shippingCost });
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
    if (order.status !== 'pendingPayment') return error(res, 'Order is not pending payment', 'BAD_REQUEST', 400);
    
    const amountInPaise = Math.round(parseFloat(order.total) * 100);
    
    const rzpOrder = await rzp.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: order.order_number,
      notes: { order_id: order.id }
    });
    
    // Record payment intent
    await pool.query(
      `INSERT INTO payments (customer_user_id, method, provider_order_id, amount, currency, status)
       VALUES ($1, 'razorpay', $2, $3, 'INR', 'created')`,
      [customerId, rzpOrder.id, parseFloat(order.total)]
    );
    
    return success(res, { providerOrderId: rzpOrder.id, amount: amountInPaise, currency: 'INR' });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    return error(res, 'Failed to initialize payment', 'PAYMENT_INIT_ERROR', 500);
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
    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
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
      
      // Update Payment
      await client.query(
        `UPDATE payments SET status = 'succeeded', provider_payment_id = $1, updated_at = NOW()
         WHERE provider_intent_id = $2`,
        [providerPaymentId, providerOrderId]
      );
      
      // Update Order
      const orderRes = await client.query(
        `UPDATE orders SET status = 'paid', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [orderId]
      );
      
      const order = orderRes.rows[0];
      
      // Deduct inventory
      const itemsRes = await client.query(`SELECT * FROM order_items WHERE order_id = $1`, [orderId]);
      for (const item of itemsRes.rows) {
        await client.query(
          `UPDATE garage_inventory SET qty_available = qty_available - $1 
           WHERE product_id = $2 AND garage_id = $3`,
          [item.quantity, item.product_id, order.garage_id]
        );
      }
      
      // Generate Invoice
      const invoiceNumber = `INV-ORD-${Date.now()}`;
      await client.query(
        `INSERT INTO invoices (order_id, invoice_number, subtotal, tax_amount, total_amount, currency)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, invoiceNumber, order.subtotal, order.tax, order.total, order.currency]
      );
      
      await client.query('COMMIT');
      return success(res, { verified: true, orderId });
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
