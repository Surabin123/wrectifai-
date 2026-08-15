const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

async function run() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
