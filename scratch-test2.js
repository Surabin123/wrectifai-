require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new'
});
(async () => {
  await pool.query('CREATE TABLE IF NOT EXISTS test_json (data JSONB)');
  await pool.query('DELETE FROM test_json');
  // Pass stringified JSON like the API does
  await pool.query('INSERT INTO test_json (data) VALUES ($1)', [JSON.stringify({ a: 1 })]);
  const res = await pool.query('SELECT data FROM test_json');
  const row = res.rows[0];
  console.log("typeof data:", typeof row.data);
  console.log("data:", row.data);
  console.log("data.a:", row.data.a);
  
  // Now try inserting an object directly
  await pool.query('DELETE FROM test_json');
  await pool.query('INSERT INTO test_json (data) VALUES ($1)', [{ a: 2 }]);
  const res2 = await pool.query('SELECT data FROM test_json');
  const row2 = res2.rows[0];
  console.log("typeof data2:", typeof row2.data);
  console.log("data2:", row2.data);
  console.log("data2.a:", row2.data.a);

  process.exit(0);
})();
