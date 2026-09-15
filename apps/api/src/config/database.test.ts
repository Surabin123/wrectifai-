import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { getDbPool, query } from './database';

let pool: ReturnType<typeof getDbPool>;

// Do not close the pool inside database.test.ts as it is a shared singleton

test('DB - can connect to test database', async () => {
  const result = await query('SELECT 1 AS alive');
  assert.strictEqual(result.rows[0].alive, 1);
});

test('DB - migrations created expected tables', async () => {
  const result = await query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  const tables = result.rows.map((r: any) => r.table_name);
  assert.ok(tables.includes('users'), 'users table missing');
  assert.ok(tables.includes('roles'), 'roles table missing');
  assert.ok(tables.includes('vehicles'), 'vehicles table missing');
  assert.ok(tables.includes('garages'), 'garages table missing');
});

test('DB - seeded roles exist', async () => {
  const result = await query('SELECT code FROM roles ORDER BY code');
  const codes = result.rows.map((r: any) => r.code);
  assert.deepStrictEqual(codes, ['admin', 'customer', 'delivery_agent', 'garage', 'user', 'vendor']);
});

test('DB - can insert and delete a user', async () => {
  const roleId = (await query("SELECT id FROM roles WHERE code = 'customer'")).rows[0].id;
  const insertResult = await query(
    'INSERT INTO users (email, name, status) VALUES ($1, $2, $3) RETURNING id, email',
    ['test-run@example.com', 'Test User', 'active']
  );
  const userId = insertResult.rows[0].id;
  assert.strictEqual(insertResult.rows[0].email, 'test-run@example.com');

  await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);

  const lookup = await query('SELECT u.email, r.code FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE u.id = $1', [userId]);
  assert.strictEqual(lookup.rows[0].email, 'test-run@example.com');
  assert.strictEqual(lookup.rows[0].code, 'customer');

  // cleanup
  await query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
  await query('DELETE FROM users WHERE id = $1', [userId]);
});
