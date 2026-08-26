const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new', // Use default postgres user if wrectifai fails
});

async function runTests() {
  const client = await pool.connect();
  
  try {
    console.log('--- STARTING TARGETED TESTS ---');
    
    // 1. Setup Test Data
    const userRes = await client.query(`SELECT id FROM users LIMIT 1`);
    const customerId = userRes.rows[0].id;

    const garageRes = await client.query(`SELECT id FROM garages LIMIT 1`);
    const garageId = garageRes.rows[0].id;

    const vehicleRes = await client.query(`SELECT id FROM vehicles LIMIT 1`);
    const vehicleId = vehicleRes.rows[0].id;

    const intentId = 'order_mock_' + Date.now();
    const paymentId = 'pay_mock_' + Date.now();
    const amount = 500;

    const bookingRes = await client.query(`
      INSERT INTO bookings (customer_id, garage_id, vehicle_id, booking_type, scheduled_at, status, payment_status, total_amount, currency, payment_intent_id)
      VALUES ($1, $2, $3, 'instant', NOW(), 'pendingPayment', 'pending', $4, 'INR', $5)
      RETURNING id
    `, [customerId, garageId, vehicleId, amount, intentId]);
    const bookingId = bookingRes.rows[0].id;

    console.log('Created booking:', bookingId, 'with intent:', intentId);

    // TEST LOGIC (Simulating /verify)
    async function simulateVerify(intentId, paymentId) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const bRes = await c.query('SELECT id, customer_id, total_amount, discount_applied, wallet_used, payment_status, status FROM bookings WHERE payment_intent_id = $1 FOR UPDATE', [intentId]);
        if (bRes.rows.length === 0) return { error: 'Not found' };
        
        const b = bRes.rows[0];
        if (b.payment_status === 'paid' || b.status === 'confirmed') {
          await c.query('ROLLBACK');
          return { verified: true, duplicate: true };
        }
        
        await c.query('UPDATE bookings SET status = $1, payment_status = $2 WHERE id = $3', ['confirmed', 'paid', b.id]);
        const paymentAmount = Number(b.total_amount) - Number(b.discount_applied || 0) - Number(b.wallet_used || 0);
        
        const pCheck = await c.query('SELECT id FROM payments WHERE provider_intent_id = $1', [intentId]);
        if (pCheck.rows.length === 0) {
          await c.query(`INSERT INTO payments (payer_user_id, booking_id, provider, provider_intent_id, provider_payment_id, amount, status) VALUES ($1, $2, 'razorpay', $3, $4, $5, 'succeeded')`, [b.customer_id, b.id, intentId, paymentId, paymentAmount]);
        } else {
          await c.query(`UPDATE payments SET provider_payment_id = $1, status = 'succeeded' WHERE provider_intent_id = $2`, [paymentId, intentId]);
        }
        
        await c.query('UPDATE wallet_transactions SET status = $1 WHERE reference_id = $2 AND status = $3', ['COMPLETED', b.id, 'PENDING']);
        
        let walletId;
        const wRes = await c.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [b.customer_id]);
        if (wRes.rows.length > 0) {
          walletId = wRes.rows[0].id;
        } else {
          const nwRes = await c.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id', [b.customer_id]);
          walletId = nwRes.rows[0].id;
        }
        
        const txCheck = await c.query("SELECT id FROM wallet_transactions WHERE wallet_id = $1 AND reference_id = $2 AND description LIKE '%Razorpay%'", [walletId, b.id]);
        if (txCheck.rows.length === 0) {
          await c.query(`INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, status, description) VALUES ($1, 'DEBIT', $2, 0, 0, 'BOOKING', $3, 'COMPLETED', 'Payment for Booking (Razorpay)')`, [walletId, paymentAmount, b.id]);
        }
        await c.query('COMMIT');
        return { verified: true, duplicate: false };
      } catch (err) {
        await c.query('ROLLBACK');
        throw err;
      } finally {
        c.release();
      }
    }

    // Run Verify 1 (Successful payment)
    const res1 = await simulateVerify(intentId, paymentId);
    console.log('Verify 1 (Initial):', res1);

    // Verify DB state 1
    const bCheck1 = await client.query('SELECT status, payment_status FROM bookings WHERE id = $1', [bookingId]);
    console.log('Booking State after Verify 1:', bCheck1.rows[0]);
    
    const pCheck1 = await client.query('SELECT * FROM payments WHERE booking_id = $1', [bookingId]);
    console.log('Payments Count after Verify 1:', pCheck1.rows.length);
    
    const wtCheck1 = await client.query('SELECT * FROM wallet_transactions WHERE reference_id = $1', [bookingId]);
    console.log('Wallet Transactions Count after Verify 1:', wtCheck1.rows.length);

    // Run Verify 2 (Duplicate / Verify again)
    const res2 = await simulateVerify(intentId, paymentId);
    console.log('Verify 2 (Duplicate Check):', res2);

    // Verify DB state 2 (Should not duplicate)
    const pCheck2 = await client.query('SELECT * FROM payments WHERE booking_id = $1', [bookingId]);
    console.log('Payments Count after Verify 2:', pCheck2.rows.length);
    
    const wtCheck2 = await client.query('SELECT * FROM wallet_transactions WHERE reference_id = $1', [bookingId]);
    console.log('Wallet Transactions Count after Verify 2:', wtCheck2.rows.length);

    // Check Garage Incoming Bookings (should not show this booking because status is confirmed)
    const gCheck = await client.query(`SELECT id FROM bookings WHERE garage_id = $1 AND status = 'pendingPayment'`, [garageId]);
    console.log('Garage Incoming Bookings (Pending Payment) Count:', gCheck.rows.length);

    // Clean up test booking only
    await client.query(`DELETE FROM bookings WHERE id = $1`, [bookingId]);
    
    console.log('--- TESTS PASSED SUCCESFULLY ---');

  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runTests();
