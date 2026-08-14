const { Client } = require('pg');
const client = new Client('postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new');
client.connect().then(async () => {
  let userRes = await client.query("SELECT id FROM users WHERE name = 'Demo Garage 1 Owner'");
  let uid;
  if (userRes.rows.length === 0) {
    const ures = await client.query("INSERT INTO users (mobile_number, name, email, status) VALUES ('+919999999901', 'Demo Garage 1 Owner', 'demo1@wrectifai.com', 'active') ON CONFLICT (mobile_number) DO UPDATE SET name = 'Demo Garage 1 Owner' RETURNING id");
    uid = ures.rows[0].id;
  } else {
    uid = userRes.rows[0].id;
  }

  const garages = await client.query("SELECT id FROM garages WHERE name = 'demo garage 1'");
  if (garages.rows.length === 0) {
    await client.query("INSERT INTO garages (name, address, city, owner_user_id, approval_status) VALUES ('demo garage 1', 'Demo Address', 'Demo City', $1, 'inactive')", [uid]);
    console.log("Inserted garage");
  } else {
    await client.query("UPDATE garages SET owner_user_id = $1 WHERE name = 'demo garage 1'", [uid]);
    console.log("Updated garage owner");
  }
  client.end();
}).catch(console.error);
