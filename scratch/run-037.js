const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgresql://postgres:Smruti@22@localhost:5432/wrectifai_new' });

(async () => {
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, '../apps/api/src/db/migrations/037_add_refund_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration 037...');
    await client.query(sql);
    console.log('Migration completed successfully.');
    
    // Verify constraint
    const res = await client.query(`
      SELECT cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'payments' AND tc.constraint_type = 'CHECK' AND tc.constraint_name = 'payments_status_check'
    `);
    console.log('New check_clause:', res.rows[0]?.check_clause);
    
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    client.release();
    pool.end();
  }
})();
