const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
c.connect().then(async () => {
  const res = await c.query("SELECT name, location, distance_km FROM garages WHERE city ILIKE 'Bengaluru'");
  console.log(JSON.stringify(res.rows, null, 2));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
