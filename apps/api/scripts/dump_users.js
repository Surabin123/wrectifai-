require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/wrectifai' });

async function dumpUsers() {
  try {
    const res = await pool.query('SELECT id, email, name FROM users');
    console.log(res.rows);
  } finally {
    pool.end();
  }
}
dumpUsers();
