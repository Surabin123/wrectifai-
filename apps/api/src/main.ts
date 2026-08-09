import { getEnv } from './config/env';
import { createApp } from './app';
import { runMigrations } from './db/migrations';

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
