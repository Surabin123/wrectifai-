const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new'
});

async function main() {
  await client.connect();
  try {
    console.log("=== ALL USERS ===");
    const res = await client.query(`
      SELECT id, name, email, mobile_number, status, country, location
      FROM users
      ORDER BY created_at DESC
    `);
    
    for (const row of res.rows) {
      console.log(`User: ${row.name} | Email: ${row.email} | Mobile: ${row.mobile_number} | ID: ${row.id} | Country: ${row.country}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
