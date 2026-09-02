import { Router } from 'express';
import { getDbPool } from '../../config/database';
import { success, error } from '../../utils/response';
import { authenticate, requireRole } from '../../middleware/auth';
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
      `INSERT INTO payments (payer_user_id, order_id, provider, provider_intent_id, provider_order_id, amount, currency, status)
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
         WHERE transaction_id = $2`,
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

// POST /api/v1/orders/:id/assign-delivery - Assign a delivery agent to an order
ordersRouter.post('/:id/assign-delivery', authenticate, async (req, res) => {
  const { id } = req.params;
  const { deliveryAgentId } = req.body;
  const garageOwnerId = req.user?.userId;

  if (!deliveryAgentId) {
    return error(res, 'Delivery agent ID is required', 'BAD_REQUEST', 400);
  }

  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Verify that the user is the garage owner for this order
    const orderRes = await client.query(`
      SELECT o.id, o.garage_id, o.fulfillment_mode, o.status, g.owner_user_id
      FROM orders o
      JOIN garages g ON o.garage_id = g.id
      WHERE o.id = $1
    `, [id]);

    if (orderRes.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderRes.rows[0];
    
    // Admin override could be added here, but sticking to garage owner for now
    // Actually let's assume either Admin or the actual Garage Owner
    const isOwner = order.owner_user_id === garageOwnerId;
    // We would need to check if they are admin too, but for now we enforce owner
    
    if (!isOwner) {
      throw new Error('Unauthorized to assign delivery for this order');
    }

    if (order.fulfillment_mode !== 'thirdParty' && order.fulfillment_mode !== 'delivery') {
      // The current DB schema had 'inHouse' and 'thirdParty' for fulfillment_mode
      // But we will allow assigning anyway if they explicitly try to assign it.
    }

    // 2. Check if already assigned
    const existingAssignRes = await client.query(`
      SELECT id FROM delivery_assignments WHERE order_id = $1
    `, [id]);
    
    if (existingAssignRes.rows.length > 0) {
      throw new Error('Delivery agent already assigned to this order');
    }

    // 3. Verify delivery agent exists and has correct role
    const agentRes = await client.query(`
      SELECT u.id FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND r.code = 'delivery_agent'
    `, [deliveryAgentId]);

    if (agentRes.rows.length === 0) {
      throw new Error('Invalid delivery agent');
    }

    // 4. Create assignment
    const assignmentRes = await client.query(`
      INSERT INTO delivery_assignments (order_id, garage_id, delivery_agent_id, status)
      VALUES ($1, $2, $3, 'ASSIGNED') RETURNING *
    `, [id, order.garage_id, deliveryAgentId]);

    await client.query('COMMIT');
    return success(res, assignmentRes.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Assign delivery error:', err);
    return error(res, err.message, 'ASSIGN_DELIVERY_ERROR', 400);
  } finally {
    client.release();
  }
});

// GET /api/v1/orders/garage - Get all orders for the authenticated garage
ordersRouter.get('/garage', authenticate, requireRole(['garage', 'admin']), async (req, res) => {
  const userId = req.user?.userId;
  const pool = getDbPool();
  try {
    // Get garage ID for user
    const garageRes = await pool.query('SELECT id FROM garages WHERE owner_user_id = $1', [userId]);
    if (garageRes.rows.length === 0) return error(res, 'Garage not found', 'NOT_FOUND', 404);
    const garageId = garageRes.rows[0].id;

    const ordersRes = await pool.query(`
      SELECT o.*, 
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
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      WHERE o.garage_id = $1
      GROUP BY o.id, da.id
      ORDER BY o.created_at DESC
    `, [garageId]);

    return success(res, ordersRes.rows);
  } catch (err) {
    console.error('Fetch garage orders error', err);
    return error(res, 'Failed to fetch orders', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// PUT /api/v1/orders/:id/status - Update order status
ordersRouter.put('/:id/status', authenticate, requireRole(['garage', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user?.userId;

  try {
    const pool = getDbPool();
    // check ownership
    const checkRes = await pool.query(`
      SELECT o.id FROM orders o 
      JOIN garages g ON o.garage_id = g.id 
      WHERE o.id = $1 AND g.owner_user_id = $2
    `, [id, userId]);

    if (checkRes.rows.length === 0) {
      return error(res, 'Unauthorized or order not found', 'UNAUTHORIZED', 401);
    }

    const updateRes = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    return success(res, updateRes.rows[0]);
  } catch (err) {
    console.error('Update order status error', err);
    return error(res, 'Failed to update order', 'INTERNAL_SERVER_ERROR', 500);
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
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      WHERE o.customer_id = $1
      GROUP BY o.id, da.id
      ORDER BY o.created_at DESC
    `, [customerId]);

    return success(res, ordersRes.rows);
  } catch (err) {
    console.error('Fetch customer orders error', err);
    return error(res, 'Failed to fetch customer orders', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// GET /api/v1/orders/admin/all - Get ALL orders for admin
ordersRouter.get('/admin/all', authenticate, requireRole(['admin']), async (req, res) => {
  const pool = getDbPool();
  try {
    const ordersRes = await pool.query(`
      SELECT o.*, 
        json_agg(json_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'name', p.name
        )) as items,
        g.name as garage_name,
        u.name as customer_name,
        da.status as delivery_status,
        agent.name as delivery_agent_name
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN garages g ON o.garage_id = g.id
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      LEFT JOIN users agent ON da.delivery_agent_id = agent.id
      GROUP BY o.id, da.id, g.name, u.name, agent.name
      ORDER BY o.created_at DESC
    `);

    return success(res, ordersRes.rows);
  } catch (err) {
    console.error('Fetch admin orders error', err);
    return error(res, 'Failed to fetch admin orders', 'INTERNAL_SERVER_ERROR', 500);
  }
});

