// build: 2026-08-24T06:35Z — fix quotes comparison_label constraint
import { resolve } from 'path';
require('dotenv').config({ path: resolve(__dirname, '../../../../.env') });
import { getEnv } from './config/env';
import { createApp } from './app';
import { runMigrations } from './db/migrations';
import dns from 'dns';

// Fix ENOTFOUND errors on some Windows setups where IPv6 fails
dns.setDefaultResultOrder('ipv4first');

const { host, port } = getEnv();

async function startServer() {
  try {
    // Run database migrations before starting the listener
    await runMigrations();
    
    const app = createApp();
    app.listen(port, host, () => {
      console.log(`[api] listening on http://${host}:${port}`);
    });
  } catch (error) {
    console.error('Fatal error during startup, server not started:', error);
    process.exit(1);
  }
}

startServer();
