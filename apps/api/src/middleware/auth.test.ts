import { test, mock } from 'node:test';
import assert from 'node:assert';
import { Pool } from 'pg';

// Mock DB pool queries
const mockRows: any[] = [];
mock.method(Pool.prototype, 'query', async (text: string, params?: any[]) => {
  if (text.includes('status FROM users')) {
    return { rows: [{ status: 'active' }] };
  }
  if (text.includes('user_roles')) {
    return { rows: mockRows };
  }
  return { rows: [] };
});

import { authenticate, requireRole } from './auth';
import { generateAccessToken } from '../services/jwt.service';
import type { Request, Response } from 'express';

function createMockRes() {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res as any;
}

test('auth middleware - authenticate valid token', async () => {
  const token = generateAccessToken({ userId: 'user-123', email: 'test@example.com', roles: ['customer'] });
  const req: any = { headers: { authorization: `Bearer ${token}` } };
  const res = createMockRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await authenticate(req as Request, res, next);
  assert.ok(nextCalled);
  assert.strictEqual(req.user?.userId, 'user-123');
  assert.strictEqual(req.user?.email, 'test@example.com');
});

test('auth middleware - authenticate missing token', async () => {
  const req: any = { headers: {} };
  const res = createMockRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await authenticate(req as Request, res, next);
  assert.ok(!nextCalled);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
});

test('auth middleware - authenticate expired token', async () => {
  // Generate expired token by using a short expiration and waiting, or mocking jwt
  const req: any = { headers: { authorization: 'Bearer expired.token.here' } };
  const res = createMockRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await authenticate(req as Request, res, next);
  assert.ok(!nextCalled);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
});

test('auth middleware - requireRole checks user roles mapping from token', async () => {
  const req: any = { user: { userId: 'user-123', roles: ['customer'] } };
  const res = createMockRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  const middleware = requireRole(['admin']);
  await middleware(req as Request, res, next);

  assert.ok(!nextCalled);
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.body.error.code, 'FORBIDDEN');

  // Set user roles to include admin
  req.user.roles = ['admin'];
  let nextCalledSuccess = false;
  const nextSuccess = () => { nextCalledSuccess = true; };

  await middleware(req as Request, res, nextSuccess);
  assert.ok(nextCalledSuccess);
});

test('auth middleware - requireRole maps customer to user', async () => {
  const req: any = { user: { userId: 'user-123', roles: ['customer'] } };
  const res = createMockRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  const middleware = requireRole(['user']);
  await middleware(req as Request, res, next);

  assert.ok(nextCalled);
});
