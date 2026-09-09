require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/wrectifai' });

async function audit() {
  try {
    const garages = await pool.query(`
      SELECT 
        g.*, 
        u.email as login_email, 
        u.name as user_name,
        u.password_hash
      FROM garages g
      LEFT JOIN users u ON g.owner_user_id = u.id
    `);

    require('fs').writeFileSync('audit_output.json', JSON.stringify(garages.rows, null, 2));

    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables:");
    console.log(tables.rows.map(r => r.table_name));

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
audit();
