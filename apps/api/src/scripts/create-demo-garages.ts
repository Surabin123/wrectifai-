import { query } from '../config/database';

async function run() {
  for (let i = 1; i <= 12; i++) {
    const phone = '99999999' + i.toString().padStart(2, '0');
    const name = 'Demo Garage ' + i;
    
    // Check if a user with this phone already exists
    const existing = await query('SELECT id FROM users WHERE mobile_number = $1', [phone]);
    
    if (existing.rows.length === 0) {
      // Create User
      const userRes = await query(
        "INSERT INTO users (mobile_number, name, email, status) VALUES ($1, $2, $3, 'active') RETURNING id",
        [phone, name + ' Owner', 'garage' + i + '@demo.com']
      );
      const userId = userRes.rows[0].id;
      
      // Assign Garage Role
      const roleRes = await query("SELECT id FROM roles WHERE code = 'garage'");
      if (roleRes.rows.length > 0) {
        await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleRes.rows[0].id]);
      }
      
      // Create Garage Record
      await query(
        "INSERT INTO garages (owner_user_id, name, address, city, state, approval_status) VALUES ($1, $2, $3, $4, $5, 'approved')", 
        [userId, name, '123 Demo St', 'Demo City', 'Demo State']
      );
      console.log('Created ' + name + ' with phone ' + phone);
    } else {
      console.log('Phone already in use (possibly already mapped): ' + phone);
    }
  }
  process.exit(0);
}

run();
