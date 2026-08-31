import { getDbPool } from './apps/api/src/config/database';
async function test() {
  const pool = getDbPool();
  try {
    await pool.query('BEGIN');
    await pool.query(`INSERT INTO payments (payer_user_id, booking_id, provider, provider_intent_id, provider_payment_id, amount, status) VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'razorpay', 'test', 'test', 0, 'succeeded')`);
    await pool.query('ROLLBACK');
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}
test();
