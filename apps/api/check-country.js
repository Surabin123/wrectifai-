const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
c.connect().then(async () => {
  const r = await c.query("SELECT name, country, location->>'country' as loc_country FROM garages WHERE approval_status='active' LIMIT 3");
  console.log(JSON.stringify(r.rows, null, 2));
  c.end();
}).catch(e => { console.error(e.message); process.exit(1); });
