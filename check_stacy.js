const { Pool } = require('pg');

async function checkQueries() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
  try {
    const res = await pool.query(`SELECT id, name, mobile_number, country FROM users WHERE name ILIKE '%stacy%';`);
    console.log(res.rows);
  } catch(e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
}
checkQueries();
