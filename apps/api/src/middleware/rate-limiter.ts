import { Request, Response, NextFunction } from 'express';
import { error } from '../utils/response';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

export function rateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  /** Paths that should be excluded from this limiter (e.g. /me, /refresh) */
  skipPaths?: string[];
}) {
  const MAX_KEYS = 10000;
  const ipLimits = new Map<string, RateLimitInfo>();

  // Periodically clean up expired entries
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of ipLimits.entries()) {
      if (now > value.resetTime) {
        ipLimits.delete(key);
      }
    }
  }, 60000);

  // Unref the timer so it doesn't hold open the Node process
  if (cleanupTimer.unref) cleanupTimer.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip paths that shouldn't be rate-limited by this instance (e.g. /auth/me, /auth/refresh)
    if (options.skipPaths && options.skipPaths.some(p => req.path === p || req.path.startsWith(p))) {
      return next();
    }

    // Key rate limiter by IP, or by user account ID when authenticated
    let clientKey = 'unknown';
    try {
      const authUser = (req as any).user?.userId;
      const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
      clientKey = authUser ? `usr_${authUser}` : `ip_${clientIp}`;
    } catch {
      clientKey = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    }
    const now = Date.now();

    // If map exceeds max keys, evict oldest entries to prevent memory exhaustion
    if (ipLimits.size >= MAX_KEYS) {
      const firstKey = ipLimits.keys().next().value;
      if (firstKey) ipLimits.delete(firstKey);
    }

    let limitInfo = ipLimits.get(clientKey);

    if (!limitInfo || now > limitInfo.resetTime) {
      limitInfo = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      ipLimits.set(clientKey, limitInfo);
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', options.max - 1);
      res.setHeader('X-RateLimit-Reset', new Date(limitInfo.resetTime).toISOString());
      return next();
    }

    limitInfo.count++;

    const remaining = Math.max(0, options.max - limitInfo.count);
    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', new Date(limitInfo.resetTime).toISOString());

    if (limitInfo.count > options.max) {
      res.setHeader('Retry-After', Math.ceil((limitInfo.resetTime - now) / 1000));
      return error(res, options.message, 'TOO_MANY_REQUESTS', 429);
    }

    next();
  };
}
