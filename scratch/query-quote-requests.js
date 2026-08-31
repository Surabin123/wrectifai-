const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

async function run() {
  try {
    const garages = await pool.query(`SELECT DISTINCT s.garage_id, g.name FROM services s LEFT JOIN garages g ON s.garage_id = g.id`);
    console.log("GARAGES WITH SERVICES:", JSON.stringify(garages.rows, null, 2));

    // requests query removed
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
