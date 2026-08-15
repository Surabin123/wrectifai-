const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

async function run() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'garages';");
    console.log("GARAGES COLUMNS: ", res.rows);
    const rows = await pool.query("SELECT id, name, city, address FROM garages LIMIT 5;");
    console.log("SAMPLE GARAGES: ", rows.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
