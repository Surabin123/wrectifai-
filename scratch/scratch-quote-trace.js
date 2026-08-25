const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new'
});

async function addMissingUserColumns() {
  try {
    console.log("Adding missing location and currency columns to users...");
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(10)');
    console.log("Columns successfully added.");
  } catch (err) {
    console.error("Failed to add columns:", err.message);
  } finally {
    pool.end();
  }
}

addMissingUserColumns();
