import { Pool } from 'pg';
import { getEnv } from './env';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (process.env.MOCK_DB === 'true') {
    return {
      query: async () => ({ rows: [] }),
      on: () => {},
      connect: async () => ({
        query: async () => ({ rows: [] }),
        release: () => {},
      }),
    } as any;
  }

  if (!pool) {
    const { databaseUrl } = getEnv();

    // Strict TLS certificate validation for remote DBs to prevent MITM.
    // Local connections (localhost/127.0.0.1) don't use SSL/TLS.
    const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
    const ssl = isLocal ? false : {
      rejectUnauthorized: true,
    };

    pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      ssl,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const dbPool = getDbPool();
  try {
    const res = await dbPool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[db] executed query: ${text.slice(0, 100).replace(/\s+/g, ' ')}... (${duration}ms)`);
    }
    return res;
  } catch (error) {
    console.error(`[db] query execution error: ${text}`, error);
    throw error;
  }
}
