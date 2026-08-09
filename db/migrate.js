#!/usr/bin/env node
/**
 * Simple migration runner for Render (or any environment without Docker init).
 * Reads all *.sql files from db/migrations/ in sort order and executes them.
 *
 * Usage:  node db/migrate.js
 * Env:    DATABASE_URL (required)
 */

const { readdirSync, readFileSync } = require('fs');
const { join } = require('path');
const { Client } = require('pg');

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

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  const ssl = isLocal ? false : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };

  const client = new Client({ connectionString: databaseUrl, ssl });
  await client.connect();

  // Ensure migrations tracking table exists (schema_migrations)
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query('BEGIN');
  try {
    // Acquire transaction-level advisory lock to prevent concurrent runs
    await client.query('SELECT pg_advisory_xact_lock(54321)');

    const applied = await client.query('SELECT name FROM schema_migrations');
    const appliedSet = new Set(applied.rows.map((r) => r.name));

    let ran = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        continue;
      }

      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      console.log(`Applying ${file}...`);
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      ran++;
      console.log(`  ✓ ${file}`);
    }
    await client.query('COMMIT');
    console.log(`\nDone. ${ran} migration(s) applied, ${files.length - ran} already applied.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Migration failed:`, err.message);
    await client.end();
    process.exit(1);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
