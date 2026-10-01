// build: 2026-08-24T06:35Z — fix quotes comparison_label constraint
import { resolve } from 'path';
require('dotenv').config({ path: resolve(__dirname, '../../../../.env') });
import { getEnv } from './config/env';
import { createApp } from './app';
import { closeDbPool, getDbPool } from './config/database';
import { releaseExpiredOrderReservations } from './modules/orders/order-inventory.service';
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

    let reservationCleanupRunning = false;
    const cleanupExpiredReservations = async () => {
      if (reservationCleanupRunning) return;
      reservationCleanupRunning = true;
      let client: Awaited<ReturnType<ReturnType<typeof getDbPool>['connect']>> | null = null;
      try {
        client = await getDbPool().connect();
        await client.query('BEGIN');
        await releaseExpiredOrderReservations(client);
        await client.query('COMMIT');
      } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => undefined);
        console.error('[orders] expired inventory reservation cleanup failed:', err);
      } finally {
        reservationCleanupRunning = false;
        client?.release();
      }
    };
    const reservationCleanupTimer = setInterval(() => void cleanupExpiredReservations(), 60_000);
    reservationCleanupTimer.unref();
    void cleanupExpiredReservations();

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      clearInterval(reservationCleanupTimer);
      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          await closeDbPool();
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
