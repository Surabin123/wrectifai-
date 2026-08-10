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

  // Trust proxies to correctly resolve client IPs (essential for rate limiting behind load balancers/Render/Cloudflare)
  app.set('trust proxy', true);

  // CORS configuration must be first so that rate limiters and error handlers get CORS headers
  const allowedOrigins = env.corsOrigins.map((o) => o.replace(/\/$/, ''));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, false);
        }
        const normalizedOrigin = origin.replace(/\/$/, '');
        // Dynamically allow local development and Render subdomains to prevent config issues.
        const isAllowed = 
          allowedOrigins.includes(normalizedOrigin) ||
          normalizedOrigin.endsWith('.onrender.com') ||
          normalizedOrigin.startsWith('http://localhost:') ||
          normalizedOrigin.startsWith('http://127.0.0.1:') ||
          normalizedOrigin === 'http://localhost' ||
          normalizedOrigin === 'http://127.0.0.1';

        if (isAllowed) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
    })
  );

  // Global rate limiter: 100 requests per 15 minutes
  app.use(
    rateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 1000, // Increased to accommodate active usage
      message: 'Too many requests from this IP, please try again after 15 minutes',
    })
  );

  // Authentication rate limiter: 100 requests per 1 minute
  const authRateLimiter = rateLimiter({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many authentication attempts. Please try again after 1 minute.',
  });
  app.use('/api/v1/auth', authRateLimiter);
  app.use('/api/auth', authRateLimiter);

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
