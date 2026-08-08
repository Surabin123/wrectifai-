const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'wrectifai_new',
  password: 'Smruti@22',
  port: 5432,
});

async function run() {
  try {
    const userRes = await pool.query("SELECT * FROM users WHERE id = '0da3117a-2097-4358-83bf-d5bc65388171'");
    console.log("Garage Owner User:", userRes.rows[0]);
    
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
