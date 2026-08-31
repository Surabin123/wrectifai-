const { Pool } = require('pg');
const fs = require('fs');
const dbUrl = fs.readFileSync('.env', 'utf-8').match(/DATABASE_URL="?([^"\n]+)"?/)[1];
const pool = new Pool({ connectionString: dbUrl });

async function test() {
  try {
    const res = await pool.query("SELECT payment_intent_id FROM bookings LIMIT 1");
    console.log('payment_intent_id EXISTS. value:', res.rows[0]?.payment_intent_id);
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}
test();
