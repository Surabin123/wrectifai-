const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
(async () => {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT tc.constraint_name, cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'payments' AND tc.constraint_type = 'CHECK'
    `);
    console.log('CONSTRAINTS:', res.rows);
  } finally {
    client.release();
    pool.end();
  }
})()
