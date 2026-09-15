import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwt.service';
import { error } from '../utils/response';
import { query } from '../config/database';

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
    
    // Authoritative check against the database
    const userResult = await query('SELECT status FROM users WHERE id = $1 LIMIT 1', [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return error(res, 'User not found', 'UNAUTHORIZED', 401);
    }
    
    if (userResult.rows[0].status !== 'active') {
      return error(res, 'Account is not active', 'FORBIDDEN', 403);
    }
    
    const roleResult = await query(
      `SELECT r.code FROM roles r 
       JOIN user_roles ur ON r.id = ur.role_id 
       WHERE ur.user_id = $1`,
      [decoded.userId]
    );
    
    decoded.roles = roleResult.rows.map(r => r.code);
    req.user = decoded;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    return error(res, `Authentication failed: ${message}`, 'UNAUTHORIZED', 401);
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
