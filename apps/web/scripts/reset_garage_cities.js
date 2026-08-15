/**
 * Reset demo garage cities back to 'Demo City' so that:
 *  - The /garages/search endpoint (which filters by city) is bypassed
 *  - The /garages endpoint (no filter) returns all 12 garages
 *  - The frontend injects the user's selected city as display context
 */
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new',
});

async function run() {
  const res = await pool.query(
    "UPDATE garages SET city = 'Demo City', address = '123 Demo St' WHERE name LIKE 'Demo Garage%'"
  );
  console.log(`Reset ${res.rowCount} demo garages back to Demo City.`);
  pool.end();
}
run().catch(console.error);
