const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

async function run() {
  try {
    const res = await pool.query("SELECT name, mobile_number, country, preferred_currency FROM users WHERE name ILIKE '%Emily%';");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
