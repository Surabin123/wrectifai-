import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getEnv } from '../config/env';
import { query } from '../config/database';

export interface UserTokenPayload {
  userId: string;
  email?: string;
  name?: string;
  roles: string[];
  garageId?: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

export function generateAccessToken(payload: UserTokenPayload): string {
  const { jwtSecret } = getEnv();
  const privileged = payload.roles.some((role) => ['admin', 'garage', 'vendor', 'delivery_agent'].includes(role));
  return jwt.sign(payload, jwtSecret, { expiresIn: privileged ? '5m' : '15m' });
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  const { jwtRefreshSecret } = getEnv();
  return jwt.sign(payload, jwtRefreshSecret, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): UserTokenPayload {
  const { jwtSecret } = getEnv();
  return jwt.verify(token, jwtSecret) as UserTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const { jwtRefreshSecret } = getEnv();
  return jwt.verify(token, jwtRefreshSecret) as RefreshTokenPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function storeRefreshToken(userId: string, token: string, deviceInfo?: string, ipAddress?: string): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info, ip_address) VALUES ($1, $2, $3, $4, $5)',
    [userId, tokenHash, expiresAt, deviceInfo || null, ipAddress || null]
  );
}

export async function validateRefreshTokenInDb(token: string): Promise<string> {
  const tokenHash = hashToken(token);
  const result = await query(
    'SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash]
  );
  if (result.rows.length === 0) {
    throw new Error('Refresh token not found or already invalidated');
  }
  const { user_id, expires_at } = result.rows[0];
  if (new Date() > new Date(expires_at)) {
    await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    throw new Error('Refresh token expired');
  }
  return user_id;
}

export async function deleteRefreshTokenInDb(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}

