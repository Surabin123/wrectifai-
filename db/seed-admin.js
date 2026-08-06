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

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
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

seed();
