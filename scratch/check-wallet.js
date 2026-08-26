const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
(async () => {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'wallet_transactions'
    `);
    console.log('WALLET_TRANSACTIONS:', res.rows);
  } finally {
    client.release();
    pool.end();
  }
})()
