const { Pool } = require('pg');

async function checkDb(dbName) {
  const pool = new Pool({ connectionString: `postgresql://postgres:Smruti@22@localhost:5432/${dbName}` });
  try {
    const q = await pool.query("SELECT COUNT(*) FROM quotes;");
    const b = await pool.query("SELECT COUNT(*) FROM bookings;");
    const g = await pool.query("SELECT COUNT(*) FROM garages;");
    console.log(`DB ${dbName}: Quotes=${q.rows[0].count}, Bookings=${b.rows[0].count}, Garages=${g.rows[0].count}`);
  } catch(e) {
    console.log(`DB ${dbName}: Error ${e.message}`);
  } finally {
    await pool.end();
  }
}

async function run() {
  await checkDb('wrectifai');
  await checkDb('wrectifai_new');
}
run();
