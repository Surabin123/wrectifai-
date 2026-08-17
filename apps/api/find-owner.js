const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });
c.connect().then(async () => {
  // Find an existing owner_user_id from garages table to use for seeded garages
  const r1 = await c.query("SELECT owner_user_id FROM garages WHERE owner_user_id IS NOT NULL LIMIT 1");
  console.log('Sample owner_user_id:', r1.rows[0]?.owner_user_id);
  
  // Also check if owner_user_id can be null
  const r2 = await c.query("SELECT is_nullable FROM information_schema.columns WHERE table_name='garages' AND column_name='owner_user_id'");
  console.log('owner_user_id nullable:', r2.rows[0]?.is_nullable);
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
