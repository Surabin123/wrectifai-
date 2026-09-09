require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/wrectifai' });

async function dumpMobile() {
  try {
    const res = await pool.query('SELECT id, name, mobile_number FROM users WHERE id = $1', ['00000000-0000-0000-0000-000000000003']);
    console.log(res.rows);
  } finally {
    pool.end();
  }
}
dumpMobile();
