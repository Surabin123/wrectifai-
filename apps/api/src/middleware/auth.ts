import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwt.service';
import { error } from '../utils/response';
import { query } from '../config/database';

const authStateCache = new Map<string, { status: string; roles: string[]; expiresAt: number }>();

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.accessToken;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return error(res, 'Authentication token missing or invalid format', 'UNAUTHORIZED', 401);
  }

  try {
    const decoded = verifyAccessToken(token);
    
    const userId = decoded.userId;

    // Check short-lived cache (30s TTL) to prevent query spam on every request
    const cacheKey = `user_auth_${userId}`;
    const cached = authStateCache.get(cacheKey);
    const now = Date.now();

    if (cached && now < cached.expiresAt) {
      if (cached.status !== 'active') {
        return error(res, 'Account is not active', 'FORBIDDEN', 403);
      }
      decoded.roles = cached.roles;
      req.user = decoded;
      return next();
    }

    // Single combined query joining users and user_roles
    const result = await query(
      `SELECT u.status, COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1
       GROUP BY u.id, u.status
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return error(res, 'User not found', 'UNAUTHORIZED', 401);
    }

    const { status, roles } = result.rows[0];
    if (status !== 'active') {
      return error(res, 'Account is not active', 'FORBIDDEN', 403);
    }

    // Cache valid user status and roles for 30 seconds
    authStateCache.set(cacheKey, { status, roles, expiresAt: now + 30000 });

    decoded.roles = roles;
    req.user = decoded;
    next();
  } catch (err) {
    const requestId = Array.isArray(req.headers['x-request-id']) ? req.headers['x-request-id'][0] : req.headers['x-request-id'] || 'unknown';
    console.warn(`[${requestId}] Authentication failed:`, err instanceof Error ? err.message : 'Invalid token');
    return error(res, 'Authentication failed', 'UNAUTHORIZED', 401);
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);
    }

    const tokenRoles = user.roles || [];
    const mappedRoles = tokenRoles.flatMap((role) => (role === 'customer' ? ['user', 'customer'] : [role]));
    const hasRole = mappedRoles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return error(res, 'Forbidden: Insufficient permissions', 'FORBIDDEN', 403);
    }

    next();
  };
}
