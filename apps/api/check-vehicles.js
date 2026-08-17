const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
c.connect().then(async () => {
  const res = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='vehicles'");
  console.log(JSON.stringify(res.rows, null, 2));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
