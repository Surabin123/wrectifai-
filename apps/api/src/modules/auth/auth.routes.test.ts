import { test, mock } from 'node:test';
import assert from 'node:assert';
import { Pool } from 'pg';

// Setup Mock DB responses
let dbQueryResults: any = { rows: [] };
const handleQuery = async (text: string, params?: any[]) => {
  if (text.includes('SELECT status FROM users')) {
    return { rows: [{ status: 'active' }] };
  }
  if (text.includes('SELECT * FROM users')) {
    return { rows: dbQueryResults.users || [] };
  }
  if (text.includes('INSERT INTO users')) {
    return {
      rows: [
        {
          id: 'user-google-123',
          email: params?.[0],
          name: params?.[1],
          status: 'active',
          mobile_number: null,
        },
      ],
    };
  }
  if (text.includes('SELECT id FROM roles')) {
    return { rows: [{ id: 'role-customer-id' }] };
  }
  if (text.includes('SELECT r.code')) {
    return { rows: [{ code: 'customer' }] };
  }
  if (text.includes('SELECT user_id, expires_at FROM refresh_tokens')) {
    return {
      rows: [
        {
          user_id: 'user-google-123',
          expires_at: new Date(Date.now() + 500000),
        },
      ],
    };
  }
  return { rows: [] };
};

mock.method(Pool.prototype, 'query', handleQuery);
mock.method(Pool.prototype, 'connect', async () => ({
  query: handleQuery,
  release: () => {
    // mock release
  },
}));

import express from 'express';
import { authRouter } from './auth.routes';
import { generateRefreshToken } from '../../services/jwt.service';

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

function request(method: string, path: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    // Basic in-memory routing mock using standard express routing
    const req: any = {
      method,
      url: path,
      headers: { 'content-type': 'application/json' },
      body,
    };

    const res: any = {
      statusCode: 200,
      headers: {},
      getHeader(name: string) {
        return this.headers[name.toLowerCase()];
      },
      setHeader(name: string, value: string) {
        this.headers[name.toLowerCase()] = value;
      },
      append(name: string, value: string) {
        const key = name.toLowerCase();
        if (this.headers[key]) {
          if (Array.isArray(this.headers[key])) {
            this.headers[key].push(value);
          } else {
            this.headers[key] = [this.headers[key], value];
          }
        } else {
          this.headers[key] = value;
        }
      },
      cookie(name: string, value: string) {
        this.append('set-cookie', `${name}=${value}`);
      },
      clearCookie(name: string) {
        this.append('set-cookie', `${name}=; Max-Age=0`);
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        resolve({ status: this.statusCode, body: data });
      },
      send(data: any) {
        resolve({ status: this.statusCode, body: data });
      },
      end() {
        resolve({ status: this.statusCode, body: null });
      },
    };

    (app as any).handle(req, res);
  });
}

test('auth routes - POST /auth/google creates user and returns tokens', async () => {
  dbQueryResults = { users: [] }; // New user registration

  const response = await request('POST', '/auth/google', { credential: 'mock_tester' });
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.user.email, 'tester@wrectifai.com');
  assert.ok(response.body.data.accessToken);
  assert.ok(response.body.data.refreshToken);
});

test('auth routes - POST /auth/refresh rotates tokens', async () => {
  // Setup valid mock user for refresh
  dbQueryResults = {
    users: [
      {
        id: 'user-google-123',
        email: 'tester@wrectifai.com',
        name: 'Tester User',
      },
    ],
  };

  const validRefreshToken = generateRefreshToken({ userId: 'user-google-123' });
  const response = await request('POST', '/auth/refresh', { refreshToken: validRefreshToken });

  assert.strictEqual(response.status, 200);
  assert.ok(response.body.data.accessToken);
  assert.ok(response.body.data.refreshToken);
});

test('auth routes - POST /auth/logout invalidates refresh token', async () => {
  const response = await request('POST', '/auth/logout', { refreshToken: 'mock-refresh-token' });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.message, 'Logged out successfully');
});
