require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  return client.query("SELECT u.email, r.code FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON r.id = ur.role_id WHERE r.code = 'admin'")
    .then(res => console.log('Admin Users:', res.rows));
}).catch(console.error).finally(() => client.end());
