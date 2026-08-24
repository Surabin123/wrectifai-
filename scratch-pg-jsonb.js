require('dotenv').config();
const { Client } = require('pg');

async function test() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  
  await client.query('CREATE TEMP TABLE test_jsonb (data JSONB)');
  
  const obj = { minPrice: 200, maxPrice: 300 };
  
  await client.query('INSERT INTO test_jsonb (data) VALUES ($1)', [JSON.stringify(obj)]);
  
  const res = await client.query('SELECT data FROM test_jsonb');
  console.log("Returned row:", res.rows[0].data, typeof res.rows[0].data);
  console.log("Is it a string?", typeof res.rows[0].data === 'string');
  
  await client.end();
}

test().catch(console.error);
