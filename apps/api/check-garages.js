const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
client.connect().then(async () => {
  const res = await client.query("SELECT id, name, city, location, distance_km FROM garages WHERE approval_status = 'active' ORDER BY city, name LIMIT 25");
  res.rows.forEach(r => console.log(r.name, '|', r.city, '|', JSON.stringify(r.location), '|', r.distance_km));
  client.end();
}).catch(console.error);
