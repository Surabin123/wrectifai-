const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new'
});
async function runMigration() {
  try {
    await pool.query('ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;');
    console.log('Migration successful');
  } catch (err) {
    console.error('FAILED:', err.message);
  }
  process.exit(0);
}
runMigration();
