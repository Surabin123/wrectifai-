const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://wrectifai_db_0c7o_user:gxnPqS81YygUaOLxRuPA0uzRulZqrOQV@dpg-da5epsjm8hqs73cemrrg-a.oregon-postgres.render.com/wrectifai_db_0c7o',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  try {
    const roles = await client.query(`SELECT * FROM roles`);
    console.log("Roles table:", roles.rows);
    
    const userRoles = await client.query(`SELECT * FROM user_roles LIMIT 5`);
    console.log("User roles table:", userRoles.rows);
    
    const users = await client.query(`
      SELECT u.id, u.name, u.mobile_number, u.email, r.name as role_name
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LIMIT 10
    `);
    console.log("Users and Roles:", users.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
main();
