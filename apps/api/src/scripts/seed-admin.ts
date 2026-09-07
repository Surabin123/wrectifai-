import { config } from 'dotenv';
config({ path: '.env' });
import { query } from '../config/database';
import * as bcrypt from 'bcryptjs';

async function seedAdmin() {
  const email = 'admin@wrectifai.com';
  const name = 'System Admin';
  const rawPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const mobileNumber = '0000000000'; 

  try {
    if (!['development', 'test'].includes(process.env.NODE_ENV || '')) {
      throw new Error('Admin bootstrap is limited to development and test environments.');
    }
    if (!rawPassword) {
      throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be set for local admin bootstrap.');
    }
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(rawPassword, salt);

    const roleResult = await query("SELECT id FROM roles WHERE code = 'admin'");
    if (roleResult.rows.length === 0) {
      console.error("Admin role does not exist. Please run migrations first.");
      process.exit(1);
    }
    const adminRoleId = roleResult.rows[0].id;

    const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
    let adminUserId: string;

    if (existingUser.rows.length === 0) {
      console.log('Creating admin user...');
      const userResult = await query(
        "INSERT INTO users (email, name, mobile_number, password_hash, status) VALUES ($1, $2, $3, $4, 'active') RETURNING id",
        [email, name, mobileNumber, passwordHash]
      );
      adminUserId = userResult.rows[0].id;
      console.log(`Admin user created with ID: ${adminUserId}`);
    } else {
      console.log('Admin user already exists. Updating password hash...');
      adminUserId = existingUser.rows[0].id;
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, adminUserId]);
    }

    const urResult = await query('SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2', [adminUserId, adminRoleId]);
    if (urResult.rows.length === 0) {
      await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [adminUserId, adminRoleId]);
      console.log('Assigned admin role to user.');
    } else {
      console.log('Admin role already assigned.');
    }

    console.log('\nSeed successful!');
    console.log(`Email: ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
