const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
client.connect().then(async () => {
  const res = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='garages' ORDER BY ordinal_position"
  );
  console.log('Garages columns:', res.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));
  client.end();
}).catch(console.error);
