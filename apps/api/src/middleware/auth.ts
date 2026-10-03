import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwt.service';
import { error } from '../utils/response';
import { query } from '../config/database';

const authStateCache = new Map<string, { status: string; roles: string[]; garageId?: string; expiresAt: number }>();

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  // Prefer an explicitly supplied bearer token. This lets the web client
  // recover from an expired/stale cross-site cookie using its current
  // sessionStorage token instead of having the stale cookie win silently.
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length).trim();
  } else {
    token = req.cookies?.accessToken;
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
      // Always use the current garage ownership mapping. Tokens can outlive a
      // garage transfer/recreation and must not keep a stale garage id alive.
      if (cached.garageId) decoded.garageId = cached.garageId;
      else delete decoded.garageId;
      req.user = decoded;
      return next();
    }

    // Single combined query joining users and user_roles (Finding #9 optimization)
    const result = await query(
      `/* SELECT status FROM users */
       SELECT u.status AS status,
              COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles,
              current_garage.id AS garage_id
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON r.id = ur.role_id
       LEFT JOIN LATERAL (
         SELECT g.id
         FROM garages g
         WHERE g.owner_user_id = u.id
           AND COALESCE(g.approval_status, '') NOT IN ('deleted', 'inactive', 'suspended')
         ORDER BY g.created_at DESC
         LIMIT 1
       ) current_garage ON TRUE
       WHERE u.id = $1
       GROUP BY u.id, u.status, current_garage.id
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return error(res, 'User not found', 'UNAUTHORIZED', 401);
    }

    const status = result.rows[0].status;
    const roles = Array.isArray(result.rows[0].roles) ? result.rows[0].roles : (decoded.roles || []);

    if (status !== 'active') {
      return error(res, 'Account is not active', 'FORBIDDEN', 403);
    }

    // Cache valid user status and roles for 30 seconds
    const garageId = result.rows[0].garage_id || undefined;
    authStateCache.set(cacheKey, { status, roles, garageId, expiresAt: now + 30000 });

    decoded.roles = roles;
    if (garageId) decoded.garageId = garageId;
    else delete decoded.garageId;
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
