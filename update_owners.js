const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

async function run() {
  const garages = await pool.query('SELECT id, name FROM garages ORDER BY id LIMIT 12;');
  
  // Get garage role
  const roleRes = await pool.query("SELECT id FROM roles WHERE code = 'garage'");
  const roleId = roleRes.rows[0].id;
  
  let i = 1;
  for (const g of garages.rows) {
    const phone = `99999999${i.toString().padStart(2, '0')}`;
    const userName = `${g.name} Owner`;
    
    // Check if user exists
    let userRes = await pool.query('SELECT id FROM users WHERE mobile_number = $1', [phone]);
    let userId;
    
    if (userRes.rows.length === 0) {
       userRes = await pool.query("INSERT INTO users (name, mobile_number, status, country) VALUES ($1, $2, 'active', 'IN') RETURNING id", [userName, phone]);
       userId = userRes.rows[0].id;
       await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
    } else {
       userId = userRes.rows[0].id;
    }
    
    // update garage
    await pool.query('UPDATE garages SET owner_user_id = $1 WHERE id = $2', [userId, g.id]);
    i++;
  }
  
  console.log("Updated 12 garages with unique owners.");
  pool.end();
}

run();
