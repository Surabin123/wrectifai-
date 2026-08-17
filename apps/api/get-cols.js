const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
client.connect().then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'garages'")).then(res => { console.log(res.rows.map(r => r.column_name)); client.end(); });
