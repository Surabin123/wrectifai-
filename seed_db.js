const { Pool } = require('pg');
const fs = require('fs');

async function runSeed() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
  try {
    const quotesSql = fs.readFileSync('apps/api/src/db/migrations/007_quotes.sql', 'utf8');
    const bookingsSql = fs.readFileSync('apps/api/src/db/migrations/008_bookings_seed.sql', 'utf8');
    
    await pool.query(quotesSql);
    console.log("Quotes seeded");
    
    await pool.query(bookingsSql);
    console.log("Bookings seeded");
  } catch (e) {
    console.error("Error seeding", e);
  } finally {
    await pool.end();
  }
}
runSeed();
