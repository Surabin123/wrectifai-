import { query } from '../config/database';

async function seedDemoAccounts() {
  console.log('--- Starting Demo Accounts Seeding ---');
  
  try {
    // 0. Cleanup any conflicting dummy accounts
    console.log('Cleaning up old test accounts...');
    await query("DELETE FROM garages WHERE name = 'Test Garage Auto'");
    await query("DELETE FROM users WHERE name = 'Test Garage Owner' OR mobile_number LIKE '99999999%'");
    
    // 1. Fetch up to 12 garages
    const garages = await query('SELECT id, owner_user_id, name FROM garages ORDER BY id LIMIT 12');
    console.log(`Found ${garages.rows.length} garages to map.`);

    // 2. Map garages to mobile numbers 9999999901 - 9999999912
    for (let i = 0; i < garages.rows.length; i++) {
      const garage = garages.rows[i];
      const phoneStr = `99999999${(i + 1).toString().padStart(2, '0')}`;

      await query('UPDATE users SET mobile_number = $1 WHERE id = $2', [phoneStr, garage.owner_user_id]);
      console.log(`Mapped Garage "${garage.name}" (User ID: ${garage.owner_user_id}) to phone: ${phoneStr}`);
    }

    // 3. Ensure Demo Customer (9876543210) exists
    const customerPhone = '9876543210';
    let customerUser = await query('SELECT id FROM users WHERE mobile_number = $1', [customerPhone]);
    
    if (customerUser.rows.length === 0) {
      const insertCustomer = await query(
        "INSERT INTO users (mobile_number, name, email, status) VALUES ($1, 'Surabin', 'surabin@wrectifai.com', 'active') RETURNING id",
        [customerPhone]
      );
      const customerId = insertCustomer.rows[0].id;
      
      const roleResult = await query("SELECT id FROM roles WHERE code = 'customer'");
      if (roleResult.rows.length > 0) {
        await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [customerId, roleResult.rows[0].id]);
      }
      console.log(`Created Demo Customer: ${customerPhone}`);
    } else {
      console.log(`Demo Customer already exists: ${customerPhone}`);
    }

    // 4. Ensure Demo Admin (0000000000) exists
    const adminPhone = '0000000000';
    let adminUser = await query('SELECT id FROM users WHERE mobile_number = $1', [adminPhone]);
    
    if (adminUser.rows.length === 0) {
      const insertAdmin = await query(
        "INSERT INTO users (mobile_number, name, email, status) VALUES ($1, 'Test Admin', 'admin-test@wrectifai.com', 'active') RETURNING id",
        [adminPhone]
      );
      const adminId = insertAdmin.rows[0].id;
      
      const roleResult = await query("SELECT id FROM roles WHERE code = 'admin'");
      if (roleResult.rows.length > 0) {
        await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [adminId, roleResult.rows[0].id]);
      }
      console.log(`Created Demo Admin: ${adminPhone}`);
    } else {
      console.log(`Demo Admin already exists: ${adminPhone}`);
    }

    console.log('--- Demo Accounts Seeding Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding demo accounts:', error);
    process.exit(1);
  }
}

seedDemoAccounts();
