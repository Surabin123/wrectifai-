const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const roles = await pool.query('SELECT code FROM roles');
    console.log('Roles:', roles.rows.map(r => r.code));

    const orderCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
    `);
    console.log('Orders columns:', orderCols.rows.map(c => c.column_name + ' (' + c.data_type + ')'));
    
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
