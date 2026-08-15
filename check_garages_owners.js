const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

async function run() {
  const garages = await pool.query('SELECT g.id, g.name, g.owner_user_id, u.name as owner_name, u.mobile_number, u.email FROM garages g LEFT JOIN users u ON g.owner_user_id = u.id LIMIT 5;');
  console.log("Garages with owner data:");
  console.table(garages.rows);
  pool.end();
}
run();
