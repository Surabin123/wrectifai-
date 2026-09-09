import { Request } from 'express';
export function getPagination(req: Request, defaultLimit = 50) {
  const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || defaultLimit), 10) || defaultLimit));
  return { limit, offset: (page - 1) * limit };
}
