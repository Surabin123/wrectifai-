import { Request, Response, NextFunction } from 'express';
import { error } from '../utils/response';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const ipLimits = new Map<string, RateLimitInfo>();

export function rateLimiter(options: { windowMs: number; max: number; message: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Determine client IP. Supports proxy headers if proxy trust is enabled
    const ip = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

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
