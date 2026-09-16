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
import { error } from './utils/response';
export function createApp() {
  const app = express();
  const env = getEnv();

  // Trust proxies to correctly resolve client IPs (essential for rate limiting behind load balancers/Render/Cloudflare)
  app.set('trust proxy', 1);

  // Helper to validate origin against configured allowed origins, local dev environments, and Render subdomains
  const isOriginAllowed = (origin: string): boolean => {
    if (!origin) return false;
    const normalizedOrigin = origin.replace(/\/$/, '');
    const allowedOrigins = env.corsOrigins.map((o) => o.replace(/\/$/, ''));
    if (allowedOrigins.includes(normalizedOrigin)) return true;
    if (
      env.nodeEnv !== 'production' &&
      (normalizedOrigin.startsWith('http://localhost:') ||
        normalizedOrigin.startsWith('http://127.0.0.1:') ||
        normalizedOrigin === 'http://localhost' ||
        normalizedOrigin === 'http://127.0.0.1')
    ) {
      return true;
    }
    // Safely support HTTPS Render subdomains (*.onrender.com)
    if (/^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/.test(normalizedOrigin)) {
      return true;
    }
    return false;
  };

  // CORS configuration must be first so that rate limiters and error handlers get CORS headers
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
    })
  );

  // Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (env.nodeEnv === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Global rate limiter: 1000 requests per 15 minutes
  app.use(
    rateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: 'Too many requests from this IP, please try again after 15 minutes',
    })
  );

  // Specific authentication rate limits are applied internally within auth.routes.ts

  // Cookie parser
  app.use(cookieParser());

  // CSRF Protection
  app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(req.method)) {
      return next();
    }
    
    // Only apply CSRF protection if potentially authenticated via cookies.
    if (!req.cookies?.accessToken) {
      return next();
    }

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    if (origin) {
      if (!isOriginAllowed(origin)) {
        return error(res, 'CSRF violation: Invalid Origin', 'FORBIDDEN', 403);
      }
    } else if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (!isOriginAllowed(refererOrigin)) {
          return error(res, 'CSRF violation: Invalid Referer', 'FORBIDDEN', 403);
        }
      } catch (err) {
        return error(res, 'CSRF violation: Malformed Referer', 'FORBIDDEN', 403);
      }
    } else {
      return error(res, 'CSRF violation: Missing Origin and Referer', 'FORBIDDEN', 403);
    }

    // Double-submit CSRF token validation for cookie-authenticated state-changing requests
    const csrfHeader = (req.headers['x-csrf-token'] || req.headers['x-xsrf-token']) as string | undefined;
    const csrfCookie = req.cookies?.['XSRF-TOKEN'] || req.cookies?.['_csrf'];

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return error(res, 'CSRF violation: Missing or mismatched CSRF token', 'FORBIDDEN', 403);
    }

    return next();
  });

  // Body parsing middlewares.
  // rawBody is retained ONLY for Razorpay webhook routes where HMAC signature verification requires it.
  app.use('/api/v1/payments/webhook', express.json({
    limit: '1mb',
    verify: (req, _res, buf) => { (req as any).rawBody = buf.toString('utf8'); }
  }));
  app.use('/api/payments/webhook', express.json({
    limit: '1mb',
    verify: (req, _res, buf) => { (req as any).rawBody = buf.toString('utf8'); }
  }));

  // Route-specific parser limits for legitimate base64 image uploads
  const base64Parser = express.json({ limit: '10mb' });
  app.use('/api/v1/garages/upload-image', base64Parser);
  app.use('/api/garages/upload-image', base64Parser);
  app.use('/api/v1/garages/documents', base64Parser);
  app.use('/api/garages/documents', base64Parser);
  app.use('/api/v1/diagnosis/upload-media', base64Parser);
  app.use('/api/diagnosis/upload-media', base64Parser);
  app.use('/api/v1/users/avatar', base64Parser);
  app.use('/api/users/avatar', base64Parser);

  app.use(express.json({ limit: '512kb' }));
  app.use(express.urlencoded({ extended: true, limit: '512kb' }));

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
