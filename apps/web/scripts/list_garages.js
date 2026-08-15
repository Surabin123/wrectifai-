const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new',
});
pool.query("SELECT id, name, approval_status FROM garages;", (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows);
  pool.end();
});
