export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const getBaseUrl = (): string => {
  const configured =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!configured) {
    return 'http://localhost:3000/api/v1';
  }

  return configured.replace(/\/+$/, '').endsWith('/api/v1')
    ? configured.replace(/\/+$/, '')
    : `${configured.replace(/\/+$/, '')}/api/v1`;
};

export interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  _retry?: boolean;
}

export type RequestInterceptor = (url: string, config: RequestOptions) => RequestOptions | Promise<RequestOptions>;
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

export const requestInterceptors: RequestInterceptor[] = [];
export const responseInterceptors: ResponseInterceptor[] = [];

let refreshPromise: Promise<string> | null = null;
let csrfTokenCache: string | null = null;
const isDemoAuthEnabled = process.env.NEXT_PUBLIC_DEMO_AUTH_ENABLED === 'true';

function readXsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(/(?:^|; )\s*XSRF-TOKEN\s*=\s*([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getXsrfToken(): string | null {
  return readXsrfCookie() || csrfTokenCache;
}

async function ensureXsrfToken(baseUrl: string): Promise<string | null> {
  const existingToken = getXsrfToken();
  if (existingToken) {
    csrfTokenCache = existingToken;
    return existingToken;
  }

  try {
    const response = await fetch(`${baseUrl}/auth/csrf-token`, {
      method: 'GET',
      credentials: isDemoAuthEnabled ? 'omit' : 'include',
    });
    if (!response.ok) return null;

    const payload = await response.json();
    const token = payload?.data?.csrfToken || payload?.csrfToken;
    if (typeof token === 'string' && token.length > 0) {
      csrfTokenCache = token;
      return token;
    }
  } catch {
    // The protected request will report the original error if the token cannot be fetched.
  }

  return null;
}

// Reset refresh state on logout so re-login starts fresh
if (typeof window !== 'undefined') {
  window.addEventListener('auth-logout', () => {
    refreshPromise = null;
    csrfTokenCache = null;
  });
}

export async function apiClient<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  let url = path.startsWith('http') ? path : `${baseUrl}${path}`;

  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  let token: string | null = null;
  if (typeof localStorage !== 'undefined') {
    token =
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('wrectifai_demo_access_token') : null) ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token');
  }

  const method = (options.method || 'GET').toUpperCase();
  let csrfToken: string | null = null;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    csrfToken = await ensureXsrfToken(baseUrl);
  }

  const defaultHeaders: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
    ...(options.headers as Record<string, string>),
  };

  let config: RequestOptions = {
    ...options,
    // Demo mode deliberately ignores persistent cross-site cookies. Its
    // sessionStorage token expires with the browser session, so reopening the
    // site requires login again. Production continues using HttpOnly cookies.
    credentials: isDemoAuthEnabled ? 'omit' : 'include',
    headers: defaultHeaders,
  };

  // 2. Run request interceptors
  for (const interceptor of requestInterceptors) {
    config = await interceptor(url, config);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...config, headers: { ...config.headers } });
  } catch (err) {
    throw new ApiError(err instanceof Error ? err.message : 'Network error', 0);
  }

  // 3. Run response interceptors
  for (const interceptor of responseInterceptors) {
    response = await interceptor(response);
  }

  if (response.status === 401 && !config._retry && !path.includes('/auth/refresh') && !path.includes('/auth/login') && !path.includes('/auth/me')) {
    config._retry = true;

    if (typeof window !== 'undefined') {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshCsrfToken = await ensureXsrfToken(baseUrl);
            const demoRefreshToken = typeof sessionStorage !== 'undefined'
              ? sessionStorage.getItem('wrectifai_demo_refresh_token')
              : null;
            const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
              method: 'POST',
              credentials: isDemoAuthEnabled ? 'omit' : 'include',
              headers: {
                'Content-Type': 'application/json',
                ...(refreshCsrfToken ? { 'X-XSRF-TOKEN': refreshCsrfToken } : {}),
              },
              ...(demoRefreshToken ? { body: JSON.stringify({ refreshToken: demoRefreshToken }) } : {}),
            });

            if (!refreshRes.ok) {
              throw new Error('Refresh failed');
            }

            const refreshJson = await refreshRes.json();
            const newAccessToken = refreshJson?.data?.accessToken || refreshJson?.accessToken;
            if (newAccessToken && typeof sessionStorage !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_AUTH_ENABLED === 'true') {
              sessionStorage.setItem('wrectifai_demo_access_token', newAccessToken);
            }
            // Stop writing refresh tokens to localStorage (Phase 2 requirement)
            if (newAccessToken && typeof localStorage !== 'undefined') {
              localStorage.setItem('accessToken', newAccessToken);
              localStorage.removeItem('refreshToken');
            }

            return 'REFRESHED';
          } catch (_refreshErr) {
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('token');
            }
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.removeItem('wrectifai_demo_access_token');
              sessionStorage.removeItem('wrectifai_demo_refresh_token');
            }
            window.dispatchEvent(new CustomEvent('auth-logout'));
            throw new ApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED_EXPIRED');
          } finally {
            refreshPromise = null;
          }
        })();
      }

      await refreshPromise;
      
      const retryToken = typeof sessionStorage !== 'undefined'
        ? (sessionStorage.getItem('wrectifai_demo_access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token'))
        : null;
      const retryHeaders = {
        ...(config.headers as Record<string, string>),
        ...(retryToken ? { 'Authorization': `Bearer ${retryToken}` } : {}),
      };

      const retryRes = await fetch(url, { ...config, headers: retryHeaders });
      return handleResponse<T>(retryRes);
    }
  }

  return handleResponse<T>(response);
}

async function handleResponse<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  let json: { data?: T; error?: { message?: string; code?: string; details?: unknown } } | null = null;
  if (contentType && contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch {
      // Ignore parse failure
    }
  }

  if (!response.ok) {
    if (json && json.error) {
      throw new ApiError(
        json.error.message || 'API Error',
        response.status,
        json.error.code,
        json.error.details
      );
    }
    throw new ApiError(response.statusText || 'API Error', response.status);
  }

  if (json && json.data !== undefined) {
    const responseCsrfToken = (json.data as { csrfToken?: unknown })?.csrfToken;
    if (typeof responseCsrfToken === 'string' && responseCsrfToken.length > 0) {
      csrfTokenCache = responseCsrfToken;
    }
    return json.data;
  }
  return json as unknown as T;
}

apiClient.get = <T = unknown>(path: string, options?: RequestOptions) =>
  apiClient<T>(path, { ...options, method: 'GET' });

apiClient.post = <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  return apiClient<T>(path, {
    ...options,
    method: 'POST',
    body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined)
  });
};

apiClient.put = <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  return apiClient<T>(path, {
    ...options,
    method: 'PUT',
    body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined)
  });
};

apiClient.patch = <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
  apiClient<T>(path, {
    ...options,
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

apiClient.delete = <T = unknown>(path: string, options?: RequestOptions) =>
  apiClient<T>(path, { ...options, method: 'DELETE' });
