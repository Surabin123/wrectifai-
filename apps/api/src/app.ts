import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { getEnv } from './config/env';
import { rateLimiter } from './middleware/rate-limiter';
import { authenticate } from './middleware/auth';
import { query } from './config/database';

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
        // Production origins must be explicitly configured. Local origins are development-only.
        const isAllowed = 
          allowedOrigins.includes(normalizedOrigin) ||
          (env.nodeEnv !== 'production' && (
            normalizedOrigin.startsWith('http://localhost:') ||
            normalizedOrigin.startsWith('http://127.0.0.1:') ||
            normalizedOrigin === 'http://localhost' ||
            normalizedOrigin === 'http://127.0.0.1'
          ));

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
  // Excludes /me and /refresh — these are session-restore calls, not brute-force targets.
  const authRateLimiter = rateLimiter({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many authentication attempts. Please try again after 1 minute.',
    skipPaths: ['/me', '/refresh'],
  });
  app.use('/api/v1/auth', authRateLimiter);
  app.use('/api/auth', authRateLimiter);

  // Cookie parser
  app.use(cookieParser());

  // Body parsing middlewares — 20 MB limit to accommodate base64-encoded images/audio
  app.use(express.json({ limit: '20mb', verify: (req, _res, buf) => { (req as any).rawBody = buf.toString('utf8'); } }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Request logger middleware
  app.use(requestLogger);

  // Public garage images remain available; diagnosis media and garage documents require authentication.
  app.get('/uploads/diagnosis/:filename', authenticate, async (req, res) => {
    try {
      const filename = path.basename(req.params.filename);
      const url = `/uploads/diagnosis/${filename}`;
      const owner = await query(
        `SELECT dr.customer_id FROM diagnosis_media dm
         JOIN diagnosis_requests dr ON dr.id = dm.diagnosis_request_id
         WHERE dm.url = $1 LIMIT 1`, [url]
      );
      const roles = req.user?.roles || [];
      if (!owner.rows.length || (!roles.includes('admin') && owner.rows[0].customer_id !== req.user?.userId)) {
        return res.status(owner.rows.length ? 403 : 404).end();
      }
      return res.sendFile(filename, { root: path.join(process.cwd(), 'uploads', 'diagnosis') });
    } catch (err) {
      console.error('[uploads/diagnosis] retrieval failed:', err instanceof Error ? err.message : 'unknown error');
      return res.status(500).end();
    }
  });
  app.get('/uploads/garages/documents/:filename', authenticate, async (req, res) => {
    try {
      const filename = path.basename(req.params.filename);
      const url = `/uploads/garages/documents/${filename}`;
      const documentRes = await query(
        `SELECT g.owner_user_id AS owner_id FROM garage_documents gd
         JOIN garages g ON g.id = gd.garage_id
         WHERE gd.file_url = $1 LIMIT 1`, [url]
      );
      const roles = req.user?.roles || [];
      if (!documentRes.rows.length || (!roles.includes('admin') && documentRes.rows[0].owner_id !== req.user?.userId)) {
        return res.status(documentRes.rows.length ? 403 : 404).end();
      }
      return res.sendFile(filename, { root: path.join(process.cwd(), 'uploads', 'garages', 'documents') });
    } catch (err) {
      console.error('[uploads/garages/documents] retrieval failed:', err instanceof Error ? err.message : 'unknown error');
      return res.status(500).end();
    }
  });
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Mount API routers under versioned endpoint /api/v1 and fallback /api
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
