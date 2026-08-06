

import { test } from 'node:test';
import assert from 'node:assert';
import { getEnv } from './env';

test('env - default keys and warnings in development', () => {
  const mockEnv = {
    NODE_ENV: 'development',
  };

  const env = getEnv(mockEnv);
  assert.strictEqual(env.jwtSecret, 'super-secret-jwt-key');
  assert.strictEqual(env.jwtRefreshSecret, 'super-secret-refresh-key');
});

test('env - throws in production on missing JWT_SECRET', () => {
  const mockEnv = {
    NODE_ENV: 'production',
    JWT_REFRESH_SECRET: 'valid-refresh-secret',
  };

  assert.throws(() => {
    getEnv(mockEnv);
  }, /FATAL: JWT_SECRET environment variable is not set in production/);
});

test('env - throws in production on missing JWT_REFRESH_SECRET', () => {
  const mockEnv = {
    NODE_ENV: 'production',
    JWT_SECRET: 'valid-jwt-secret',
  };

  assert.throws(() => {
    getEnv(mockEnv);
  }, /FATAL: JWT_REFRESH_SECRET environment variable is not set in production/);
});
