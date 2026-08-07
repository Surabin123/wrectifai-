"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbPool = getDbPool;
exports.query = query;
const pg_1 = require("pg");
const env_1 = require("./env");
let pool = null;
function getDbPool() {
    if (!pool) {
        const { databaseUrl } = (0, env_1.getEnv)();
        pool = new pg_1.Pool({
            connectionString: databaseUrl,
            max: 20,
            idleTimeoutMillis: 30000,
        });
        pool.on('error', (err) => {
            console.error('Unexpected error on idle database client', err);
        });
    }
    return pool;
}
async function query(text, params) {
    const start = Date.now();
    const dbPool = getDbPool();
    try {
        const res = await dbPool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[db] executed query: ${text.slice(0, 100).replace(/\s+/g, ' ')}... (${duration}ms)`);
        }
        return res;
    }
    catch (error) {
        console.error(`[db] query execution error: ${text}`, error);
        throw error;
    }
}
