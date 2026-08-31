const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/wrectifai');
async function run() {
  await client.connect();
  const res = await client.query('SELECT id, email, name, status, is_active FROM users');
  console.log(res.rows);
  process.exit();
}
run();
