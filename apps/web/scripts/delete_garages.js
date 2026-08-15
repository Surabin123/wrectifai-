const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new',
});
pool.query("DELETE FROM garages WHERE name NOT LIKE 'Demo Garage%' AND name != 'Auto Care Plus';", (err, res) => {
  if (err) console.error(err);
  else console.log('Deleted ' + res.rowCount + ' extra garages.');
  pool.end();
});
