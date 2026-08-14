import { query } from './apps/api/src/config/database';

async function run() {
  try {
    console.log('Running DB updates...');
    
    // Drop existing constraint if it exists (might be named differently, so let's just alter column or drop constraint)
    console.log('Dropping existing check constraint...');
    try {
      await query("ALTER TABLE garages DROP CONSTRAINT garages_approval_status_check;");
    } catch (e) {
      console.log('Constraint might not exist or failed to drop:', e.message);
    }

    try {
      await query("ALTER TABLE users DROP CONSTRAINT users_status_check;");
    } catch (e) {
      console.log('Constraint might not exist or failed to drop:', e.message);
    }
    
    const r1 = await query("UPDATE garages SET approval_status = 'active' WHERE approval_status = 'approved'");
    console.log('Garages set to active:', r1.rowCount);
    
    const r2 = await query("UPDATE garages SET approval_status = 'inactive' WHERE approval_status = 'suspended'");
    console.log('Garages set to inactive:', r2.rowCount);

    // Also update users to active/inactive
    const r3 = await query("UPDATE users SET status = 'active' WHERE status = 'approved'");
    console.log('Users set to active:', r3?.rowCount);
    const r4 = await query("UPDATE users SET status = 'inactive' WHERE status = 'suspended'");
    console.log('Users set to inactive:', r4?.rowCount);
    
    // Check if there are any remaining garages
    const all = await query("SELECT id, name, approval_status FROM garages LIMIT 5");
    console.log('Sample garages:', all.rows);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
