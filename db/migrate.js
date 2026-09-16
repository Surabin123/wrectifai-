#!/usr/bin/env node
/**
 * Migration runner for WrectifAI.
 * Reads all *.sql files from db/migrations/ in deterministic sort order and executes them.
 * Records SHA-256 checksums and execution times in _migrations table.
 *
 * Usage:  node db/migrate.js
 * Env:    DATABASE_URL (required)
 */

const { readdirSync, readFileSync } = require('fs');
const { join } = require('path');
const { Client } = require('pg');
const { createHash } = require('crypto');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const migrationsDir = join(__dirname, '..', 'apps', 'api', 'src', 'db', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // Fixture migrations remain available for local development, but are not
  // loaded into a production database unless explicitly opted in.
  const fixtureMigrations = new Set([
    '005_dummy_test_user.sql', '008_bookings_seed.sql', '030_seed_more_garages.sql'
  ]);
  const filesToApply = process.env.NODE_ENV === 'production' && process.env.MIGRATIONS_INCLUDE_FIXTURES !== 'true'
    ? files.filter((file) => !fixtureMigrations.has(file))
    : files;

  if (filesToApply.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  const ssl = isLocal ? false : { rejectUnauthorized: false };

  const client = new Client({ connectionString: databaseUrl, ssl });
  await client.connect();

  try {
    // Ensure migrations tracking table exists (_migrations) with checksum metadata
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        checksum VARCHAR(64),
        execution_time_ms INT,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query('BEGIN');
    // Acquire transaction-level advisory lock to prevent concurrent runs
    await client.query('SELECT pg_advisory_xact_lock(54321)');

    const applied = await client.query('SELECT filename, checksum FROM _migrations');
    const appliedMap = new Map(applied.rows.map((r) => [r.filename, r.checksum]));

    let ran = 0;
    for (const file of filesToApply) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');
      const fileChecksum = createHash('sha256').update(sql).digest('hex');

      if (appliedMap.has(file)) {
        const storedChecksum = appliedMap.get(file);
        if (storedChecksum && storedChecksum !== fileChecksum) {
          console.warn(`[WARNING] Migration ${file} has been modified since it was applied! Stored: ${storedChecksum}, Current: ${fileChecksum}.`);
        }
        continue;
      }

      console.log(`Applying ${file}...`);
      const startTime = Date.now();
      await client.query(sql);
      const executionTimeMs = Date.now() - startTime;

      await client.query(
        'INSERT INTO _migrations (filename, checksum, execution_time_ms) VALUES ($1, $2, $3)',
        [file, fileChecksum, executionTimeMs]
      );
      ran++;
      console.log(`  ✓ ${file} (${executionTimeMs}ms)`);
    }
    await client.query('COMMIT');
    console.log(`\nDone. ${ran} migration(s) applied, ${filesToApply.length - ran} already applied.`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`Migration failed:`, err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
