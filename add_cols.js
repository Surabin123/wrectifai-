const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new'
});

async function main() {
  try {
    await pool.query('ALTER TABLE garages ADD COLUMN IF NOT EXISTS description TEXT;');
    await pool.query('ALTER TABLE garages ADD COLUMN IF NOT EXISTS working_hours JSONB;');
    console.log('Columns added successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}
main();
