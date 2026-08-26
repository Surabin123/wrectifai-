const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

async function audit() {
  const client = await pool.connect();
  try {
    for (const table of ['users', 'garages', 'profiles', 'payments', 'wallet_transactions']) {
      const res = await client.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', [table]);
      console.log(table, 'columns:', res.rows.map(r => r.column_name).join(', '));
    }
  } finally {
    client.release();
    pool.end();
  }
}
audit();
