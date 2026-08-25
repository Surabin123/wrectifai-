const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/wrectifai' });
pool.query('SELECT id, quote_request_id, garage_id FROM quotes LIMIT 5')
  .then(res => { console.log(JSON.stringify(res.rows, null, 2)); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
