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

    // Determine client IP safely. Express handles X-Forwarded-For when 'trust proxy' is set.
    let ip = 'unknown';
    try {
      ip = req.ip || req.socket?.remoteAddress || 'unknown';
    } catch {
      ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    }
    const now = Date.now();

    // If map exceeds max keys, evict oldest entries to prevent memory exhaustion
    if (ipLimits.size >= MAX_KEYS) {
      const firstKey = ipLimits.keys().next().value;
      if (firstKey) ipLimits.delete(firstKey);
    }

    let limitInfo = ipLimits.get(ip);

    if (!limitInfo || now > limitInfo.resetTime) {
      limitInfo = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      ipLimits.set(ip, limitInfo);
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
      return error(res, options.message, 'TOO_MANY_REQUESTS', 429);
    }

    next();
  };
}
