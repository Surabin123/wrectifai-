const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

async function run() {
  try {
    const quotes = await pool.query("SELECT COUNT(*) FROM quotes;");
    const bookings = await pool.query("SELECT COUNT(*) FROM bookings;");
    console.log("Quotes: ", quotes.rows[0].count);
    console.log("Bookings: ", bookings.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
