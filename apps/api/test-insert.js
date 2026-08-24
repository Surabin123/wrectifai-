const { Client } = require('pg');
async function test() {
  const client = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
  await client.connect();
  try {
    const res = await client.query(
      `INSERT INTO quotes (quote_request_id, garage_id, amount, currency, status, details)
       VALUES ($1, $2, $3, $4, 'active', $5)
       RETURNING id`,
      [
        'c63cc525-60b7-4c07-b359-000000000000',
        'c63cc525-60b7-4c07-b359-000000000000',
        1325,
        'USD',
        JSON.stringify({})
      ]
    );
    console.log('Success:', res.rows);
  } catch (err) {
    console.error('DB ERROR:', err.message);
  } finally {
    await client.end();
  }
}
test();
