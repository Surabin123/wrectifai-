import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { getEnv } from './config/env';

export function createApp() {
  const app = express();
  const env = getEnv();

  // Trust the first proxy (Render's load balancer) so that rate limiters
  // and secure cookies work correctly with X-Forwarded-For headers.
  app.set('trust proxy', 1);

  // CORS configuration
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    })
  );

  // Cookie parser
  app.use(cookieParser());

  // Body parsing middlewares — 20 MB limit to accommodate base64-encoded images/audio
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Request logger middleware
  app.use(requestLogger);

  // Serve static uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Mount API routers under versioned endpoint /api/v1 and fallback /api
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
