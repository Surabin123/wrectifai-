import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { getEnv } from './config/env';
import { rateLimiter } from './middleware/rate-limiter';

export function createApp() {
  const app = express();
  const env = getEnv();

  // Trust the first proxy (Render's load balancer) so that rate limiters
  // and secure cookies work correctly with X-Forwarded-For headers.
  app.set('trust proxy', 1);

  // Global rate limiter: 100 requests per 15 minutes
  app.use(
    rateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP, please try again after 15 minutes',
    })
  );

  // Strict authentication rate limiter to prevent brute-force attacks: 5 requests per 1 minute
  const authRateLimiter = rateLimiter({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts. Please try again after 1 minute.',
  });
  app.use('/api/v1/auth', authRateLimiter);
  app.use('/api/auth', authRateLimiter);

  // CORS configuration: Strict browser origin allowlist.
  // Requests without an Origin header do not receive CORS headers, but are not blocked at the application level.
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, false);
        }
        if (env.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
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
