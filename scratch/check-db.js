const { getDbPool } = require('./apps/api/src/config/database');
(async () => {
  const pool = getDbPool();
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payments'
    `);
    console.log('PAYMENTS COLUMNS:', res.rows);
    
    const res2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'wallet_transactions'
    `);
    console.log('WALLET_TRANSACTIONS COLUMNS:', res2.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
