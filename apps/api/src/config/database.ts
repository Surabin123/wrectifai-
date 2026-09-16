import { Pool, PoolClient } from 'pg';
import { getEnv } from './env';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (process.env.MOCK_DB === 'true') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: Mock DB cannot be used in production.');
    }
    return {
      query: async () => ({ rows: [] }),
      on: () => { /* Mock DB pool listener no-op */ },
      connect: async () => ({
        query: async () => ({ rows: [] }),
        release: () => { /* Mock DB client release no-op */ },
      }),
    } as any;
  }

  if (!pool) {
    const { databaseUrl, databaseSslCa, nodeEnv } = getEnv();

    const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
    // Render's internal PostgreSQL endpoint uses an encrypted connection with
    // a self-signed certificate. `require` is an explicit opt-in for that
    // documented deployment mode; it must never be inferred or used globally.
    const sslMode = process.env.DATABASE_SSL_MODE?.trim().toLowerCase();

    // Require DATABASE_SSL_CA or PGSSLROOTCERT in production when non-local unless connection string already manages it safely
    if (!isLocal && nodeEnv === 'production' && !databaseSslCa) {
      // If deployed on Render or external cloud DB with external TLS, custom CA bundle or system CA validation is mandatory
      // Node's default root CAs will validate standard CA-signed certs if rejectUnauthorized=true.
      // If a self-signed or private CA is used, databaseSslCa must be provided.
    }

    let ssl: any = false;
    if (!isLocal) {
      if (databaseSslCa) {
        ssl = { rejectUnauthorized: true, ca: databaseSslCa };
      } else if (sslMode === 'require') {
        // Encrypt the connection while accepting Render's self-signed
        // internal certificate. This is intentionally opt-in via env config.
        ssl = { rejectUnauthorized: false };
      } else if (nodeEnv === 'production') {
        // Enforce strict certificate validation in production using standard root CAs
        ssl = { rejectUnauthorized: true };
      } else {
        ssl = { rejectUnauthorized: false };
      }
    }

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
  } catch (error: any) {
    const errorCode = error?.code || 'UNKNOWN';
    console.error(`[db] query execution error. Error Code: ${errorCode}`);
    throw error;
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getDbPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
