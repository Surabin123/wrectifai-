import fs from 'fs';
import path from 'path';
import { getDbPool } from '../config/database';

export async function runMigrations() {
  console.log('[migrations] Starting database migrations check...');
  const pool = getDbPool();

  // Step 1: Ensure _migrations table exists (outside of any per-migration transaction)
  const setupClient = await pool.connect();
  try {
    await setupClient.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  } finally {
    setupClient.release();
  }

  // Step 2: Get already applied migrations
  const listClient = await pool.connect();
  let applied: Set<string>;
  try {
    const { rows } = await listClient.query('SELECT filename FROM _migrations');
    applied = new Set(rows.map((r: any) => r.filename));
  } finally {
    listClient.release();
  }

  // Step 3: Locate migrations directory
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

  // Step 4: Read and sort SQL migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`[migrations] Found ${files.length} migration files in ${migrationsDir}`);

  let executedCount = 0;
  let failedCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    // Each migration runs in its OWN connection + transaction so a failure
    // does not roll back previously-applied migrations.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log(`[migrations] Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query(sql);

      await client.query(
        'INSERT INTO _migrations (filename) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      executedCount++;
      console.log(`[migrations] Successfully applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      failedCount++;
      console.error(`[migrations] Failed to apply migration: ${file}`, err);
      // Continue applying subsequent migrations — don't throw
    } finally {
      client.release();
    }
  }

  if (executedCount > 0) {
    console.log(`[migrations] Completed. Applied ${executedCount} new migrations.`);
  } else {
    console.log('[migrations] Database is up to date. No new migrations applied.');
  }
  if (failedCount > 0) {
    console.warn(`[migrations] WARNING: ${failedCount} migration(s) failed. Check logs above.`);
  }
}

