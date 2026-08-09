import fs from 'fs';
import path from 'path';
import { getDbPool } from '../config/database';

export async function runMigrations() {
  console.log('[migrations] Starting database migrations check...');
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    // 1. Start Transaction
    await client.query('BEGIN');

    // 2. Acquire transaction-level advisory lock (ID 54321) to prevent concurrent migrations
    await client.query('SELECT pg_advisory_xact_lock(54321)');
    console.log('[migrations] Acquired database advisory lock.');

    // 3. Create tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 4. Get list of already applied migrations
    const { rows } = await client.query('SELECT filename FROM _migrations');
    const applied = new Set(rows.map((r: any) => r.filename));

    // 5. Locate migrations directory (check workspace source first, fall back to dist copy)
    let migrationsDir = path.join(process.cwd(), 'apps', 'api', 'src', 'db', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(__dirname, 'db', 'migrations');
    }
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
    }

    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at ${migrationsDir}`);
    }

    // 6. Read and sort SQL migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`[migrations] Found ${files.length} migration files in ${migrationsDir}`);

    let executedCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      console.log(`[migrations] Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Execute SQL migration script
      await client.query(sql);

      // Record applied migration
      await client.query(
        'INSERT INTO _migrations (filename) VALUES ($1)',
        [file]
      );
      executedCount++;
      console.log(`[migrations] Successfully applied: ${file}`);
    }

    // 7. Commit Transaction
    await client.query('COMMIT');
    
    if (executedCount > 0) {
      console.log(`[migrations] Completed. Applied ${executedCount} new migrations.`);
    } else {
      console.log('[migrations] Database is up to date. No new migrations applied.');
    }
  } catch (error) {
    // Rollback on any failure
    await client.query('ROLLBACK');
    console.error('[migrations] Migration failed. Transaction rolled back.', error);
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
}
