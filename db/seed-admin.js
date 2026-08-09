#!/usr/bin/env node
/**
 * Seeds the admin user into the database after migrations.
 * Runs automatically on Render deploy: node db/seed-admin.js
 * Env: DATABASE_URL (required)
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: true },
  });

  await client.connect();

  const email = 'admin@wrectifai.com';
  const name = 'System Admin';
  const rawPassword = 'Admin@12345';
  const mobileNumber = '0000000000';

  try {
    // Check if admin role exists (migrations must have run first)
    const roleResult = await client.query("SELECT id FROM roles WHERE code = 'admin'");
    if (roleResult.rows.length === 0) {
      console.error('Admin role not found. Ensure migrations have run first.');
      process.exit(1);
    }
    const adminRoleId = roleResult.rows[0].id;

    // Hash the password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    // Upsert admin user (safe to run on every deploy)
    const userResult = await client.query(
      `INSERT INTO users (email, name, mobile_number, password_hash, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             name = EXCLUDED.name,
             status = EXCLUDED.status
       RETURNING id`,
      [email, name, mobileNumber, passwordHash]
    );
    const adminUserId = userResult.rows[0].id;
    console.log(`[seed] Admin user ready: ${email} (id: ${adminUserId})`);

    // Assign admin role if not already assigned
    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [adminUserId, adminRoleId]
    );
    console.log('[seed] Admin role assigned.');

    // Seed garages and customer
    await seedGarageUsers(client);
    await seedDemoCustomer(client);

    console.log('\n[seed] Done!');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${rawPassword}`);
  } catch (err) {
    console.error('[seed] Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function seedGarageUsers(client) {
  console.log('--- Starting Garage Users Seeding ---');
  
  // Get garage role ID
  const roleRes = await client.query("SELECT id FROM roles WHERE code = 'garage'");
  if (roleRes.rows.length === 0) {
    console.error('Garage role not found. Skipping garage seeding.');
    return;
  }
  const roleId = roleRes.rows[0].id;

  // Get all garages
  const garagesRes = await client.query('SELECT id, name, owner_user_id FROM garages ORDER BY id');
  console.log(`Found ${garagesRes.rows.length} garages.`);

  const DEFAULT_HASH = '$2b$10$Ts4mFbOYBqelIgnQWdc2cOFXAExrH2iTcr9kl2zhupGzx0SaCQ8ZW'; // Garage@123

  for (let i = 0; i < garagesRes.rows.length; i++) {
    const garage = garagesRes.rows[i];
    
    // We want the phone numbers to be exactly 9999999901 to 9999999912 (up to 12 garages)
    const mobile = `99999999${(i + 1).toString().padStart(2, '0')}`;
    const prefix = garage.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${prefix}@wrectifai.com`;

    // 1. Check if user already exists for this mobile number or email
    let userRes = await client.query('SELECT id FROM users WHERE mobile_number = $1 OR email = $2', [mobile, email]);
    let userId;

    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
      // Update it to make sure it has the correct mobile and email
      await client.query(
        `UPDATE users SET name = $1, email = $2, mobile_number = $3 WHERE id = $4`,
        [garage.name, email, mobile, userId]
      );
    } else {
      // Create new user
      const insertRes = await client.query(
        `INSERT INTO users (name, email, password_hash, mobile_number, status)
         VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
        [garage.name, email, DEFAULT_HASH, mobile]
      );
      userId = insertRes.rows[0].id;
    }

    // 2. Assign role to user
    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, roleId]
    );

    // 3. Map garage to this user
    await client.query(
      `UPDATE garages SET owner_user_id = $1 WHERE id = $2`,
      [userId, garage.id]
    );

    console.log(`[seed] Mapped "${garage.name}" to user ${email} (${mobile})`);
  }
}

async function seedDemoCustomer(client) {
  const customerPhone = '9876543210';
  const customerEmail = 'surabin@wrectifai.com';
  const customerName = 'Surabin';
  
  let roleRes = await client.query("SELECT id FROM roles WHERE code = 'user'");
  if (roleRes.rows.length === 0) {
    console.error('Customer/User role not found. Skipping customer seeding.');
    return;
  }
  const roleId = roleRes.rows[0].id;

  let userRes = await client.query('SELECT id FROM users WHERE mobile_number = $1 OR email = $2', [customerPhone, customerEmail]);
  let userId;

  if (userRes.rows.length > 0) {
    userId = userRes.rows[0].id;
    await client.query(
      `UPDATE users SET name = $1, email = $2, mobile_number = $3 WHERE id = $4`,
      [customerName, customerEmail, customerPhone, userId]
    );
  } else {
    const insertRes = await client.query(
      `INSERT INTO users (name, email, mobile_number, status)
       VALUES ($1, $2, $3, 'active') RETURNING id`,
      [customerName, customerEmail, customerPhone]
    );
    userId = insertRes.rows[0].id;
  }

  await client.query(
    `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, roleId]
  );
  console.log(`[seed] Demo Customer seeded: ${customerName} (${customerPhone})`);
}

seed();
