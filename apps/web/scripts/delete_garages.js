require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/wrectifai',
});
pool.query("DELETE FROM garages WHERE name NOT LIKE 'Demo Garage%' AND name != 'Auto Care Plus';", (err, res) => {
  if (err) console.error(err);
  else console.log('Deleted ' + res.rowCount + ' extra garages.');
  pool.end();
});
