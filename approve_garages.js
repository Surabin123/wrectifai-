const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

async function run() {
  try {
    const res = await pool.query("UPDATE garages SET approval_status = 'approved'");
    console.log(`Updated ${res.rowCount} garages`);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
