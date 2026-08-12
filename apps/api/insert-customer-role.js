const { Client } = require('pg');
const client = new Client('postgresql://postgres:Smruti%4022@localhost:5432/wrectifai_new');
client.connect().then(() => {
  client.query("INSERT INTO roles (id, code, name, created_at, updated_at) VALUES (gen_random_uuid(), 'customer', 'Customer', NOW(), NOW()) ON CONFLICT (code) DO NOTHING")
    .then(res => {
      console.log('Inserted customer role');
      client.end();
    })
    .catch(err => {
      console.error(err);
      client.end();
    });
});
