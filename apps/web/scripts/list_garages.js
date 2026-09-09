require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/wrectifai',
});
pool.query("SELECT id, name, approval_status FROM garages;", (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows);
  pool.end();
});
