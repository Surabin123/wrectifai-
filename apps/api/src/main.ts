// build: 2026-08-24T06:35Z — fix quotes comparison_label constraint
import { resolve } from 'path';
require('dotenv').config({ path: resolve(__dirname, '../../../../.env') });
import { getEnv } from './config/env';
import { createApp } from './app';
import dns from 'dns';

// Fix ENOTFOUND errors on some Windows setups where IPv6 fails
dns.setDefaultResultOrder('ipv4first');

const { host, port } = getEnv();

async function startServer() {
  try {
    const app = createApp();
    const server = app.listen(port, host, () => {
      console.log(`[api] listening on http://${host}:${port}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          const { pool } = require('./config/database');
          await pool.end();
          console.log('Database pool closed.');
          process.exit(0);
        } catch (err) {
          console.error('Error closing database pool', err);
          process.exit(1);
        }
      });
      
      // Force shutdown after 10s if graceful fails
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Fatal error during startup, server not started:', error);
    process.exit(1);
  }
}

startServer();
