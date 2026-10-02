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
  app.set('trust proxy', env.trustProxy);

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

  // Security Headers (CSP, Referrer-Policy, Permissions-Policy, HSTS)
  app.use((_req, res, next) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Finding #9 Fix: Remove 'unsafe-inline' from script-src in production builds
    const cspScriptSrc = env.nodeEnv === 'production'
      ? "default-src 'self'; script-src 'self' https://checkout.razorpay.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.razorpay.com https://api.groq.com; frame-src https://api.razorpay.com;"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.razorpay.com https://api.groq.com; frame-src https://api.razorpay.com;";
    res.setHeader('Content-Security-Policy', cspScriptSrc);

    if (env.nodeEnv === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Readiness Probe Endpoint (/ready) - Phase 15 deliverable
  app.get(['/ready', '/api/v1/ready'], async (_req, res) => {
    try {
      await query('SELECT 1');
      return res.status(200).json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
    } catch (err) {
      return res.status(503).json({ status: 'unready', database: 'disconnected', timestamp: new Date().toISOString() });
    }
  });

  // Tiered Rate Limiters (Finding #3 Fix)
  // Sensitive endpoints (Payments, Diagnosis/AI, Uploads) capped to 100 req/15min per IP
  const sensitiveEndpointLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests to sensitive operation, please try again after 15 minutes',
  });
  app.use(['/api/v1/payments', '/api/payments', '/api/v1/diagnosis', '/api/diagnosis', '/api/v1/garages/upload-image', '/api/garages/upload-image'], sensitiveEndpointLimiter);

  // Global rate limiter for general endpoints: 1000 requests per 15 minutes
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
    
    // Apply CSRF protection if potentially authenticated via cookies (access or refresh token).
    const hasAuthCookie = Boolean(req.cookies?.accessToken) || Boolean(req.cookies?.refreshToken);
    if (!hasAuthCookie) {
      return next();
    }

    // Exempt public auth endpoints from CSRF checks (needed when an expired cookie is still present)
    const isPublicAuthRoute = /^\/api(?:\/v1)?\/auth\/(?:login|register|verify-otp|google|check-user)$/.test(req.path);
    if (isPublicAuthRoute) {
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
  // Product requests include a small, validated base64 image (max 2 MB file).
  // Parse these before the 512 KB global JSON limit without widening other routes.
  app.use('/api/v1/garages/my-inventory/request', base64Parser);
  app.use('/api/garages/my-inventory/request', base64Parser);
  app.use('/api/v1/garages/my-offers', base64Parser);
  app.use('/api/garages/my-offers', base64Parser);
  app.use('/api/v1/garages/documents', base64Parser);
  app.use('/api/garages/documents', base64Parser);
  app.use('/api/v1/garages/my-documents', base64Parser);
  app.use('/api/garages/my-documents', base64Parser);
  // Garage registration submits the profile image and required documents as
  // base64 JSON in one request. Keep the global parser limit unchanged while
  // allowing the validated registration payload through.
  app.use('/api/v1/admin/onboarding/garages', express.json({ limit: '40mb' }));
  app.use('/api/admin/onboarding/garages', express.json({ limit: '40mb' }));
  app.use('/api/v1/diagnosis/upload-media', base64Parser);
  app.use('/api/diagnosis/upload-media', base64Parser);
  app.use('/api/v1/users/avatar', base64Parser);
  app.use('/api/users/avatar', base64Parser);
  // Vehicle pictures are submitted as base64 JSON from the vehicle form.
  // Keep this scoped to vehicle requests so the rest of the API retains the
  // smaller global request limit.
  app.use('/api/v1/vehicles', base64Parser);
  app.use('/api/vehicles', base64Parser);

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

  // Serve ONLY public subdirectories statically; private files (diagnosis media, garage documents) require authenticated endpoints above
  app.use('/uploads/public', express.static(path.join(process.cwd(), 'uploads', 'public')));
  app.use('/uploads/garages/photos', express.static(path.join(process.cwd(), 'uploads', 'garages', 'photos')));
  app.use('/uploads/vehicles', express.static(path.join(process.cwd(), 'uploads', 'vehicles')));
  app.use('/uploads/services', express.static(path.join(process.cwd(), 'uploads', 'services')));

  // Mount API routers under versioned endpoint /api/v1 and fallback /api
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
