const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new',
});

async function run() {
  try {
    const res = await pool.query("DELETE FROM garages WHERE name LIKE 'Demo Garage%' RETURNING name");
    console.log('Deleted Demo Garages:', res.rows.length);

    const sql = fs.readFileSync(path.join(__dirname, 'src', 'db', 'migrations', '012_add_missing_garages.sql'), 'utf8');
    await pool.query(sql);
    console.log('Restored original 12 garages from 012_add_missing_garages.sql');

    // Make sure they have a standard location if required, or let them keep what's in the SQL
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
