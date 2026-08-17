const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
client.connect().then(() => client.query("SELECT id, customer_name, text FROM garage_reviews ORDER BY created_at DESC LIMIT 5")).then(res => { console.table(res.rows); client.end(); }).catch(console.error);
