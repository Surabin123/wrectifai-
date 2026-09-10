import type { Response } from 'express';

export function success(res: Response, data: unknown, status = 200, meta?: unknown) {
  return res.status(status).json({
    data,
    ...(meta ? { meta } : {}),
  });
}

export function error(
  res: Response,
  message: string,
  code = 'INTERNAL_ERROR',
  status = 500,
  details?: unknown
) {
  // In production, never leak raw exception messages or stack traces for 500-level server errors
  if (process.env.NODE_ENV === 'production') {
    if (status >= 500) {
      message = 'Internal server error';
      details = undefined;
    } else if (typeof message === 'string') {
      // Prevent internal DB/FS errors from leaking even if they are erroneously passed with 4xx statuses
      const dbKeywords = ['relation "', 'syntax error', 'violates foreign key', 'violates not-null', 'duplicate key', 'column "', 'unrecognized configuration', 'operator does not exist'];
      if (dbKeywords.some(kw => message.includes(kw))) {
        message = 'Invalid request due to data conflict or format';
        details = undefined;
      }
    }
  }

  return res.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
