require('dotenv').config({path: '../../.env'});
const { Pool } = require('pg');
console.log('DATABASE_URL prefix:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) : 'NOT SET');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // All offers including global (no garage_id)
  const offersResult = await pool.query('SELECT id, code, title, garage_id, active, is_deleted FROM offers');
  console.log('=== ALL OFFERS ===', offersResult.rowCount);

  // Check if it's the production DB by checking for TorqueNest
  const garageResult = await pool.query("SELECT id, name, owner_user_id FROM garages WHERE name ILIKE '%nest%' OR name ILIKE '%torque%' LIMIT 5");
  console.log('=== TORQUENEST GARAGES ===', garageResult.rows);
}

run().catch(console.error).finally(() => pool.end());
