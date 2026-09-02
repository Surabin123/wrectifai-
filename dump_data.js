const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
  await client.connect();
  const res = await client.query(`
    SELECT id, name, category, platform_service_id FROM services LIMIT 5;
  `);
  console.log("Services:");
  console.log(JSON.stringify(res.rows, null, 2));

  const res2 = await client.query(`
    SELECT id, name, category, price FROM products LIMIT 5;
  `);
  console.log("Products:");
  console.log(JSON.stringify(res2.rows, null, 2));

  await client.end();
}
run();
