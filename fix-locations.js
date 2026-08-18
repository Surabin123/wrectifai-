require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  // Find garages where country is missing from location JSON
  const res = await client.query("SELECT id, location FROM garages WHERE location->>'country' IS NULL");
  
  console.log(`Found ${res.rows.length} garages with missing country.`);
  
  for (const row of res.rows) {
    let loc = typeof row.location === 'string' ? JSON.parse(row.location) : row.location;
    if (!loc) loc = {};
    loc.country = 'IN';
    
    await client.query("UPDATE garages SET location = $1 WHERE id = $2", [JSON.stringify(loc), row.id]);
    console.log(`Updated garage ID ${row.id}`);
  }
  
  await client.end();
}

run();
