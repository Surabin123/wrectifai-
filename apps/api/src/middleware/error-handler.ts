import type { NextFunction, Request, Response } from 'express';
import { error } from '../utils/response';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof Error) {
    const safeError: any = { message: err.message, name: err.name, stack: err.stack };
    const status = (err as any).status;
    const code = (err as any).code;
    if (status) safeError.status = status;
    if (code) safeError.code = code;
    console.error('[SafeError]', safeError);
  } else {
    console.error('[Error]', String(err));
  }

  const status = (err as any).status || 500;
  const code = (err as any).code || 'INTERNAL_SERVER_ERROR';
  const details = (err as any).details;

  // In production, never leak raw exception messages to the client.
  // Only expose messages when the error explicitly opts in (known app errors with status < 500).
  const isAppError = status < 500 && err instanceof Error;
  const message = isAppError
    ? err.message
    : process.env.NODE_ENV !== 'production'
      ? (err instanceof Error ? err.message : String(err))
      : 'Internal server error';

  return error(res, message, code, status, isAppError ? details : undefined);
}
