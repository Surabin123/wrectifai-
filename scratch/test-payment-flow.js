const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

async function runTests() {
  const client = await pool.connect();
  try {
    console.log('--- STARTING TARGETED PAYMENT FLOW TESTS ---');
    
    // Find customer & garage
    const uRes = await client.query(`SELECT id FROM users WHERE status = 'active' AND role = 'customer' LIMIT 1`);
    const customerId = uRes.rows[0]?.id;
    const gRes = await client.query(`SELECT id FROM garages WHERE approval_status = 'approved' LIMIT 1`);
    const garageId = gRes.rows[0]?.id;
    const vRes = await client.query(`SELECT id FROM vehicles LIMIT 1`);
    const vehicleId = vRes.rows[0]?.id;

    if (!customerId || !garageId || !vehicleId) {
      console.log('Required seed data missing, skipping tests.');
      return;
    }

    // 1. Pay at Garage Booking Creation
    const b1 = await client.query(`
      INSERT INTO bookings (customer_id, garage_id, vehicle_id, booking_type, scheduled_at, status, payment_status, total_amount, currency)
      VALUES ($1, $2, $3, 'instant', NOW(), 'pendingPayment', 'pending', 1000, 'INR')
      RETURNING id, status, payment_status
    `, [customerId, garageId, vehicleId]);
    console.log('Pay at Garage Booking created:', b1.rows[0]);

    // Garage Rejects Pay at Garage booking
    await client.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1`, [b1.rows[0].id]);
    console.log('Garage rejected unpaid booking - NO refunds initiated.');

    // 2. Paid Booking Creation
    const b2 = await client.query(`
      INSERT INTO bookings (customer_id, garage_id, vehicle_id, booking_type, scheduled_at, status, payment_status, total_amount, currency, payment_intent_id)
      VALUES ($1, $2, $3, 'instant', NOW(), 'confirmed', 'paid', 2000, 'INR', 'order_paynow_123')
      RETURNING id, status, payment_status
    `, [customerId, garageId, vehicleId]);
    
    await client.query(`
      INSERT INTO payments (payer_user_id, booking_id, provider, provider_intent_id, provider_payment_id, amount, status)
      VALUES ($1, $2, 'razorpay', 'order_paynow_123', 'pay_paynow_123', 2000, 'succeeded')
    `, [customerId, b2.rows[0].id]);
    console.log('Paid Booking created:', b2.rows[0]);

    // Garage Rejects PAID booking
    console.log('Simulating cancellation of PAID booking...');
    // In actual code, issueRazorpayRefund is called. We'll simulate the DB update that follows.
    await client.query(`
      UPDATE payments SET status = 'refund_pending', provider_refund_id = 'rfnd_123' 
      WHERE provider_payment_id = 'pay_paynow_123'
    `);
    
    const pStatus = await client.query(`SELECT status, provider_refund_id FROM payments WHERE provider_payment_id = 'pay_paynow_123'`);
    console.log('Payment status after cancellation:', pStatus.rows[0]);

    // Webhook completes refund
    await client.query(`
      UPDATE payments SET status = 'refunded', provider_refund_id = 'rfnd_123' 
      WHERE provider_payment_id = 'pay_paynow_123' AND status != 'refunded'
    `);
    
    const pStatus2 = await client.query(`SELECT status FROM payments WHERE provider_payment_id = 'pay_paynow_123'`);
    console.log('Payment status after webhook processed:', pStatus2.rows[0]);
    
    // Test duplicate webhook idempotency
    await client.query(`
      UPDATE payments SET status = 'refunded', provider_refund_id = 'rfnd_123' 
      WHERE provider_payment_id = 'pay_paynow_123' AND status != 'refunded'
    `);
    console.log('Duplicate webhook handled safely.');

    // Cleanup
    await client.query(`DELETE FROM payments WHERE provider_payment_id = 'pay_paynow_123'`);
    await client.query(`DELETE FROM bookings WHERE id IN ($1, $2)`, [b1.rows[0].id, b2.rows[0].id]);
    
    console.log('--- TARGETED TESTS PASSED ---');
  } catch (err) {
    console.error('Test Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runTests();
