import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { apiClient, ApiError } from './api-client';

type MockFetch = typeof globalThis.fetch;

// Mock localStorage
const localStorageStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => localStorageStore[key] || null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value.toString();
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
  clear: () => {
    for (const key in localStorageStore) {
      delete localStorageStore[key];
    }
  },
};

globalThis.localStorage = mockLocalStorage as unknown as Storage;
const sessionStorageStore: Record<string, string> = {};
const mockSessionStorage = {
  getItem: (key: string) => sessionStorageStore[key] || null,
  setItem: (key: string, value: string) => { sessionStorageStore[key] = value.toString(); },
  removeItem: (key: string) => { delete sessionStorageStore[key]; },
  clear: () => { for (const key in sessionStorageStore) delete sessionStorageStore[key]; },
};
globalThis.sessionStorage = mockSessionStorage as unknown as Storage;
globalThis.window = {
  dispatchEvent: () => true,
} as unknown as Window & typeof globalThis;

let originalFetch: MockFetch;
let fetchCalls: { url: string; config: RequestInit }[] = [];

beforeEach(() => {
  originalFetch = globalThis.fetch;
  fetchCalls = [];
  mockLocalStorage.clear();
  mockSessionStorage.clear();
  delete process.env.NEXT_PUBLIC_API_URL;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function setupMockFetch(responses: { status: number; statusText: string; headers?: Record<string, string>; json: unknown }[]) {
  let index = 0;
  globalThis.fetch = async (url: string | URL | Request, config?: RequestInit) => {
    const urlStr = url.toString();
    fetchCalls.push({ url: urlStr, config: config || {} });
    const mockRes = responses[index] || responses[responses.length - 1];
    index++;

    const resHeaders = new Headers({
      'content-type': 'application/json',
      ...(mockRes.headers || {}),
    });

    return {
      ok: mockRes.status >= 200 && mockRes.status < 300,
      status: mockRes.status,
      statusText: mockRes.statusText,
      headers: resHeaders,
      json: async () => mockRes.json,
    } as Response;
  };
}

test('apiClient - Base URL construction', async () => {
  // Test fallback default base URL
  setupMockFetch([{ status: 200, statusText: 'OK', json: { data: { success: true } } }]);
  await apiClient('/test-endpoint');
  assert.strictEqual(fetchCalls[0].url, 'http://localhost:3000/api/v1/test-endpoint');

  // Test custom base URL override via env variable
  process.env.NEXT_PUBLIC_API_URL = 'https://custom-api.example.com/v2';
  setupMockFetch([{ status: 200, statusText: 'OK', json: { data: { success: true } } }]);
  await apiClient('/test-endpoint');
  assert.strictEqual(fetchCalls[1].url, 'https://custom-api.example.com/v2/api/v1/test-endpoint');
});

test('apiClient - Auth header injection', async () => {
  localStorage.setItem('accessToken', 'test-bearer-token');
  setupMockFetch([{ status: 200, statusText: 'OK', json: { data: { authenticated: true } } }]);
  
  await apiClient('/profile');
  const headers = fetchCalls[0].config.headers;
  assert.strictEqual(headers['Authorization'], 'Bearer test-bearer-token');
});

test('apiClient - Response envelope unwrapping', async () => {
  setupMockFetch([{ status: 200, statusText: 'OK', json: { data: { id: 42, username: 'tester' } } }]);
  
  const result = await apiClient('/user');
  assert.deepStrictEqual(result, { id: 42, username: 'tester' });
});

test('apiClient - Error normalization', async () => {
  setupMockFetch([{
    status: 400,
    statusText: 'Bad Request',
    json: {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email address',
        details: { field: 'email' }
      }
    }
  }]);

  try {
    await apiClient('/submit');
    assert.fail('Should have thrown an ApiError');
  } catch (err) {
    assert.ok(err instanceof ApiError);
    assert.strictEqual(err.status, 400);
    assert.strictEqual(err.code, 'VALIDATION_ERROR');
    assert.strictEqual(err.message, 'Invalid email address');
    assert.deepStrictEqual(err.details, { field: 'email' });
  }
});

test('apiClient - 401 silent retry token refresh logic', async () => {
  localStorage.setItem('accessToken', 'expired-token');
  localStorage.setItem('refreshToken', 'valid-refresh-token');

  // Setup sequence of responses:
  // 1. Initial request fails with 401
  // 2. CSRF token request succeeds
  // 3. Token refresh request succeeds with new access token
  // 4. Retried initial request succeeds
  setupMockFetch([
    {
      status: 401,
      statusText: 'Unauthorized',
      json: { error: { message: 'Token expired', code: 'UNAUTHORIZED' } }
    },
    {
      status: 200,
      statusText: 'OK',
      json: { data: { csrfToken: 'csrf-token' } }
    },
    {
      status: 200,
      statusText: 'OK',
      json: { data: { accessToken: 'new-valid-token' } }
    },
    {
      status: 200,
      statusText: 'OK',
      json: { data: { resource: 'secret-data' } }
    }
  ]);

  const result = await apiClient('/protected-resource');

  // Verify fetch calls
  assert.strictEqual(fetchCalls.length, 4);
  
  // Call 1: Original request with expired token
  assert.strictEqual(fetchCalls[0].url, 'http://localhost:3000/api/v1/protected-resource');
  assert.strictEqual(fetchCalls[0].config.headers['Authorization'], 'Bearer expired-token');
  
  // Call 2: CSRF bootstrap uses HttpOnly cookie credentials
  assert.strictEqual(fetchCalls[1].url, 'http://localhost:3000/api/v1/auth/csrf-token');
  assert.strictEqual(fetchCalls[1].config.credentials, 'include');

  // Call 3: Refresh uses the CSRF token and secure refresh cookie
  assert.strictEqual(fetchCalls[2].url, 'http://localhost:3000/api/v1/auth/refresh');
  assert.strictEqual(fetchCalls[2].config.credentials, 'include');
  assert.strictEqual(fetchCalls[2].config.headers['X-XSRF-TOKEN'], 'csrf-token');

  // Call 4: Retried original request with new token
  assert.strictEqual(fetchCalls[3].url, 'http://localhost:3000/api/v1/protected-resource');
  assert.strictEqual(fetchCalls[3].config.headers['Authorization'], 'Bearer new-valid-token');

  // Verify final unwrapped result
  assert.deepStrictEqual(result, { resource: 'secret-data' });
  
  // The refreshed access token is session-scoped; the legacy local token is not overwritten.
  assert.strictEqual(sessionStorage.getItem('wrectifai_session_access_token'), 'new-valid-token');
});
