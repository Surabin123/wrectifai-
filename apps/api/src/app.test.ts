import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { createApp } from './app';

let server: http.Server;
let port: number;

beforeEach(async () => {
  process.env.MOCK_DB = 'true';
  const app = createApp();
  server = app.listen(0); // Listen on a random free port
  port = (server.address() as any).port;
});

afterEach(() => {
  if (server) {
    server.close();
  }
  delete process.env.MOCK_DB;
});

test('GET /health - returns 200 and health status', async () => {
  const res = await fetch(`http://localhost:${port}/api/v1/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.data);
});

test('CORS - rejects disallowed origin by not reflecting it', async () => {
  const res = await fetch(`http://localhost:${port}/api/v1/health`, {
    headers: {
      'Origin': 'http://evil-origin.com',
    },
  });
  
  const corsHeader = res.headers.get('access-control-allow-origin');
  assert.strictEqual(corsHeader, null);
});

test('CORS - accepts allowed origin and normalizes trailing slash', async () => {
  const res = await fetch(`http://localhost:${port}/api/v1/health`, {
    headers: {
      'Origin': 'http://localhost:3001/',
    },
  });
  
  const corsHeader = res.headers.get('access-control-allow-origin');
  assert.strictEqual(corsHeader, 'http://localhost:3001/');
});

test('Rate Limiter - sets rate limit headers', async () => {
  const res = await fetch(`http://localhost:${port}/api/v1/health`);
  assert.strictEqual(res.headers.get('x-ratelimit-limit'), '100');
  assert.ok(res.headers.get('x-ratelimit-remaining'));
});
