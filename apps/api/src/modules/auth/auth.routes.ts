import { Router } from 'express';
import { success, error } from '../../utils/response';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  storeRefreshToken,
  validateRefreshTokenInDb,
  deleteRefreshTokenInDb,
} from '../../services/jwt.service';
import { verifyGoogleIdToken } from '../../services/google-auth.service';
import { query, withTransaction } from '../../config/database';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticate, requireRole } from '../../middleware/auth';
import { CookieOptions, Response } from 'express';
import { NotificationsService } from '../notifications/notifications.service';
import { getEnv } from '../../config/env';

export const authRouter = Router();

const cookieConfig: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

function setTokensInCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, cookieConfig);
  res.cookie('refreshToken', refreshToken, cookieConfig);
}

const HARDCODED_PHONES = ['9876543210', '1234567890'];

function normalizedPhone(value: string): string {
  return value.replace(/\D/g, '');
}

const normalizedPhoneSql = "regexp_replace(mobile_number, '[^0-9]', '', 'g')";

function checkIfPasswordResetRequired(passwordHash: string, userRoles: string[]): boolean {
  const temporaryPassword = getEnv().adminTemporaryPassword;
  return userRoles.includes('admin') && !!passwordHash && !!temporaryPassword && bcrypt.compareSync(temporaryPassword, passwordHash);
}

// Helper to register/login a user from a verified OAuth profile (Google, Apple, etc.)
export async function handleUserLoginOrRegister(email: string, name: string, deviceInfo?: string, ipAddress?: string) {
  if (email) email = email.toLowerCase();
  
  const { user, roles, isNew, garageId } = await withTransaction(async (client) => {
    let userRecord;
    let isNewRecord = false;

    const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      userRecord = existingUser.rows[0];
    } else {
      const userResult = await client.query(
        "INSERT INTO users (email, name, status) VALUES ($1, $2, 'active') RETURNING id, email, name, mobile_number, status, country",
        [email, name]
      );
      userRecord = userResult.rows[0];
      isNewRecord = true;
    }

    if (isNewRecord) {
      const roleResult = await client.query("SELECT id FROM roles WHERE code = 'customer'");
      if (roleResult.rows.length > 0) {
        const roleId = roleResult.rows[0].id;
        await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userRecord.id, roleId]);
      }
    }

    const rolesResult = await client.query(
      'SELECT r.code FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1',
      [userRecord.id]
    );
    const rolesArray = rolesResult.rows.map((row) => row.code);

    if (rolesArray.length === 0) {
      const defaultRole = await client.query("SELECT id, code FROM roles WHERE code = 'customer'");
      if (defaultRole.rows.length > 0) {
        await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userRecord.id, defaultRole.rows[0].id]);
        rolesArray.push(defaultRole.rows[0].code);
      }
    }

    let gId = undefined;
    if (rolesArray.includes('garage')) {
      const garageResult = await client.query('SELECT id FROM garages WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1', [userRecord.id]);
      if (garageResult.rows.length > 0) {
        gId = garageResult.rows[0].id;
      }
    }
    
    return { user: userRecord, roles: rolesArray, isNew: isNewRecord, garageId: gId };
  });

  const accessToken = generateAccessToken({ userId: user.id, email: user.email, name: user.name, roles, garageId });
  const refreshToken = generateRefreshToken({ userId: user.id });

  await storeRefreshToken(user.id, refreshToken, deviceInfo, ipAddress);

  await query(
    'INSERT INTO login_activity (user_id, device_info, ip_address, status) VALUES ($1, $2, $3, $4)',
    [user.id, deviceInfo || null, ipAddress || null, 'success']
  ).catch(e => console.error('Failed to log activity', e));

  if (isNew && roles.includes('customer')) {
    await NotificationsService.createNotification({
      isAdmin: true,
      type: 'System',
      title: 'New User Registered',
      description: `${user.name} has registered.`
    }).catch(err => console.error('Failed to create notification', err));
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      mobileNumber: user.mobile_number,
      status: user.status,
      country: user.country,
      roles,
    },
    accessToken,
    refreshToken,
  };
}

// POST /auth/google
authRouter.post('/google', async (req, res) => {
  const token = req.body.idToken || req.body.credential;
  if (!token) {
    return error(res, 'Google ID Token (idToken/credential) is required', 'BAD_REQUEST', 400);
  }

  try {
    const googlePayload = await verifyGoogleIdToken(token);
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = (req.socket ? req.ip : undefined) || (req.headers['x-forwarded-for'] as string) || '';
    const authResult = await handleUserLoginOrRegister(googlePayload.email, googlePayload.name, deviceInfo, ipAddress);
    
    setTokensInCookies(res, authResult.accessToken, authResult.refreshToken);
    
    return success(res, {
      user: authResult.user,
      accessToken: authResult.accessToken,
      refreshToken: authResult.refreshToken,
    }, 200);
  } catch (err) {
    return error(res, err instanceof Error ? err.message : 'Google authentication failed', 'UNAUTHORIZED', 401);
  }
});

authRouter.post('/check-user', async (req, res, next) => {
  const { mobileNumber } = req.body;
  if (mobileNumber && typeof mobileNumber !== 'string') return error(res, 'Invalid phone number format', 'BAD_REQUEST', 400);
  if (!mobileNumber) {
    return error(res, 'Phone number is required', 'BAD_REQUEST', 400);
  }

  try {
    const phone = normalizedPhone(mobileNumber);
    if (!phone) return error(res, 'Invalid phone number format', 'BAD_REQUEST', 400);
    const existingUser = await query(`SELECT id FROM users WHERE ${normalizedPhoneSql} = $1`, [phone]);
    return success(res, { exists: existingUser.rows.length > 0 }, 200);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/register', async (req, res, next) => {
  const { mobileNumber, name, otp, password, country, referralCode } = req.body;
  let { email } = req.body;
  if ((email && typeof email !== 'string') || (password && typeof password !== 'string') || (name && typeof name !== 'string') || (mobileNumber && typeof mobileNumber !== 'string') || (otp && typeof otp !== 'string')) {
    return error(res, 'Invalid input format', 'BAD_REQUEST', 400);
  }
  if (email) email = email.toLowerCase();
  
  if (!name) {
    return error(res, 'Name is required', 'BAD_REQUEST', 400);
  }

  try {
    const { user, roles, garageId, isNew } = await withTransaction(async (client) => {
      let userRecord;
      let isNewRecord = false;
      
      if (email && password) {
        const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
          throw new Error('Account already exists with this email. Please sign in.');
        }
        
        if (mobileNumber) {
          const existingPhone = await client.query('SELECT * FROM users WHERE mobile_number = $1', [mobileNumber]);
          if (existingPhone.rows.length > 0) {
            throw new Error('Account already exists with this phone number. Please sign in.');
          }
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newRefCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        let referredById = null;
        if (referralCode) {
          const referrerRes = await client.query('SELECT id FROM users WHERE referral_code = $1', [referralCode.toUpperCase()]);
          if (referrerRes.rows.length > 0) {
            referredById = referrerRes.rows[0].id;
          }
        }
        
        const userResult = await client.query(
          "INSERT INTO users (email, name, password_hash, mobile_number, status, referral_code, referred_by) VALUES ($1, $2, $3, $4, 'active', $5, $6) RETURNING id, email, name, mobile_number, status, referral_code, country",
          [email, name, hashedPassword, mobileNumber || null, newRefCode, referredById]
        );
        userRecord = userResult.rows[0];
        isNewRecord = true;
      } else {
        if (!mobileNumber || !otp) {
          throw new Error('Phone number and OTP are required');
        }
        if (otp !== '1234' && otp !== '123456') {
          throw new Error('Invalid phone number or OTP');
        }
        const existingUser = await client.query(`SELECT * FROM users WHERE ${normalizedPhoneSql} = $1`, [normalizedPhone(mobileNumber)]);
        if (existingUser.rows.length > 0) {
          throw new Error('Account already exists with this phone number. Please sign in.');
        }
        
        const newRefCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        let referredById = null;
        if (referralCode) {
          const referrerRes = await client.query('SELECT id FROM users WHERE referral_code = $1', [referralCode.toUpperCase()]);
          if (referrerRes.rows.length > 0) {
            referredById = referrerRes.rows[0].id;
          }
        }
        
        const userResult = await client.query(
          "INSERT INTO users (mobile_number, name, status, referral_code, referred_by) VALUES ($1, $2, 'active', $3, $4) RETURNING id, email, name, mobile_number, status, referral_code, country",
          [mobileNumber, name, newRefCode, referredById]
        );
        userRecord = userResult.rows[0];
        isNewRecord = true;
      }

      if (isNewRecord) {
        const roleResult = await client.query("SELECT id FROM roles WHERE code = 'customer'");
        if (roleResult.rows.length > 0) {
          const roleId = roleResult.rows[0].id;
          await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userRecord.id, roleId]);
        }
      }

      const rolesResult = await client.query(
        'SELECT r.code FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1',
        [userRecord.id]
      );
      const rolesArray = rolesResult.rows.map((row) => row.code);

      let gId = undefined;
      if (rolesArray.includes('garage')) {
        const garageResult = await client.query('SELECT id FROM garages WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1', [userRecord.id]);
        if (garageResult.rows.length > 0) {
          gId = garageResult.rows[0].id;
        }
      }

      return { user: userRecord, roles: rolesArray, garageId: gId, isNew: isNewRecord };
    });

    const accessToken = generateAccessToken({ userId: user.id, name: user.name, roles, garageId });
    const refreshToken = generateRefreshToken({ userId: user.id });

    await storeRefreshToken(user.id, refreshToken);

    setTokensInCookies(res, accessToken, refreshToken);

    if (isNew && roles.includes('customer')) {
      await NotificationsService.createNotification({
        isAdmin: true,
        type: 'System',
        title: 'New User Registered',
        description: `${user.name} has registered.`
      }).catch(err => console.error('Failed to create notification', err));
    }

    return success(res, {
      user: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobile_number,
        status: user.status,
        roles,
        country: user.country,
      }
    }, 201);
  } catch (err: any) {
    if (err.message.includes('Account already exists')) {
      return error(res, err.message, 'CONFLICT', 409);
    }
    if (err.message.includes('required') || err.message.includes('Invalid')) {
      return error(res, err.message, 'BAD_REQUEST', 400);
    }
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  const { mobileNumber, otp, provider, password } = req.body;
  let { email } = req.body;
  if ((email && typeof email !== 'string') || (password && typeof password !== 'string') || (mobileNumber && typeof mobileNumber !== 'string') || (otp && typeof otp !== 'string') || (provider && typeof provider !== 'string')) {
    return error(res, 'Invalid input format', 'BAD_REQUEST', 400);
  }
  if (email) email = email.toLowerCase();

  try {
    let user;
    let isNew = false;
    let roles: string[] = [];
    let garageName = undefined;
    let garageId = undefined;
    let garages: any[] = [];
    let requiresPasswordChange = false;

    const txResult = await withTransaction(async (client) => {
      let userRecord;
      let isNewRecord = false;
      
      if (provider) {
        if (provider !== 'google' && provider !== 'apple') {
          throw new Error('Invalid OAuth provider');
        }
        throw new Error('Direct provider mock login is disabled in production.');
      } else if (email && password) {
        const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length === 0) {
          throw new Error('Invalid email or password');
        }
        userRecord = existingUser.rows[0];
        if (!userRecord.password_hash || !bcrypt.compareSync(password, userRecord.password_hash)) {
          throw new Error('Invalid email or password');
        }
      } else {
        if (!mobileNumber || !otp) {
          throw new Error('Phone number and OTP are required');
        }
        if (otp === '1234' || otp === '123456') {
          const existingUser = await client.query(`SELECT * FROM users WHERE ${normalizedPhoneSql} = $1`, [normalizedPhone(mobileNumber)]);
          if (existingUser.rows.length > 0) {
            userRecord = existingUser.rows[0];
            if (mobileNumber === '9876543210') {
              userRecord.name = userRecord.name || 'User';
            }
            const countryToSave = req.body.country || 'IN';
            if (userRecord.country !== countryToSave) {
              await client.query('UPDATE users SET country = $1 WHERE id = $2', [countryToSave, userRecord.id]);
              userRecord.country = countryToSave;
            }
          } else {
            isNewRecord = true;
            const userResult = await client.query(
              "INSERT INTO users (mobile_number, name, status, country) VALUES ($1, $2, 'active', $3) RETURNING id, mobile_number, name, status, country, email",
              [mobileNumber, mobileNumber === '9876543210' ? 'User' : 'Customer', req.body.country || 'IN']
            );
            userRecord = userResult.rows[0];
            const roleResult = await client.query("SELECT id FROM roles WHERE code = 'customer'");
            if (roleResult.rows.length > 0) {
              await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userRecord.id, roleResult.rows[0].id]);
            }
          }
        } else {
          throw new Error('Invalid phone number or OTP');
        }
      }

      const rolesResult = await client.query(
        'SELECT r.code FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1',
        [userRecord.id]
      );
      const rolesArray = rolesResult.rows.map((row) => row.code);

      if (rolesArray.length === 0) {
        const defaultRole = await client.query("SELECT id, code FROM roles WHERE code = 'customer'");
        if (defaultRole.rows.length > 0) {
          await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userRecord.id, defaultRole.rows[0].id]);
          rolesArray.push(defaultRole.rows[0].code);
        }
      }

      let gName = undefined;
      let gId = undefined;
      let gList: any[] = [];
      if (rolesArray.includes('garage')) {
        const garageResult = await client.query('SELECT id, name FROM garages WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 100', [userRecord.id]);
        if (garageResult.rows.length > 0) {
          gList = garageResult.rows.map((g: any) => ({ id: g.id, name: g.name }));
          gId = garageResult.rows[0].id;
          gName = garageResult.rows[0].name;
        }
      }

      return { user: userRecord, isNew: isNewRecord, roles: rolesArray, garageName: gName, garageId: gId, garages: gList };
    });

    user = txResult.user;
    isNew = txResult.isNew;
    roles = txResult.roles;
    garageName = txResult.garageName;
    garageId = txResult.garageId;
    garages = txResult.garages;

    requiresPasswordChange = checkIfPasswordResetRequired(user.password_hash, roles);

    const accessToken = generateAccessToken({ userId: user.id, email: user.email, name: user.name, roles, garageId });
    const refreshToken = generateRefreshToken({ userId: user.id });

    const deviceInfo = req.headers['user-agent'];
    const ipAddress = (req.socket ? req.ip : undefined) || (req.headers['x-forwarded-for'] as string) || '';

    await storeRefreshToken(user.id, refreshToken, deviceInfo, ipAddress);

    await query(
      'INSERT INTO login_activity (user_id, device_info, ip_address, status) VALUES ($1, $2, $3, $4)',
      [user.id, deviceInfo || null, ipAddress || null, 'success']
    ).catch(e => console.error('Failed to log activity', e));

    setTokensInCookies(res, accessToken, refreshToken);

    if (isNew && roles.includes('customer')) {
      await NotificationsService.createNotification({
        isAdmin: true,
        type: 'System',
        title: 'New User Registered',
        description: `${user.name} has registered.`
      }).catch(err => console.error('Failed to create notification', err));
    }

    return success(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        garageId,
        garageName,
        garages,
        mobileNumber: user.mobile_number,
        status: user.status,
        roles,
        country: user.country,
      },
      requiresPasswordChange
    });
  } catch (err: any) {
    if (err.message === 'Invalid email or password' || err.message === 'Invalid phone number or OTP' || err.message === 'Direct provider mock login is disabled in production.') {
      return error(res, err.message, 'UNAUTHORIZED', 401);
    }
    if (err.message.includes('required') || err.message.includes('Invalid')) {
      return error(res, err.message, 'BAD_REQUEST', 400);
    }
    next(err);
  }
});

authRouter.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!refreshToken) {
    return error(res, 'Refresh token is required', 'BAD_REQUEST', 400);
  }
  try {
    verifyRefreshToken(refreshToken);
    const userId = await validateRefreshTokenInDb(refreshToken);

    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return error(res, 'User not found', 'UNAUTHORIZED', 401);
    }
    const user = userResult.rows[0];
    const rolesResult = await query(
      'SELECT r.code FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1',
      [userId]
    );
    const roles = rolesResult.rows.map((row) => row.code);

    // Fallback: auto-heal sessions for users who have no roles in user_roles
    // (e.g. existing accounts created before RBAC, or after a DB reset/migration)
    if (roles.length === 0) {
      const defaultRole = await query("SELECT id, code FROM roles WHERE code = 'customer'");
      if (defaultRole.rows.length > 0) {
        await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, defaultRole.rows[0].id]);
        roles.push(defaultRole.rows[0].code);
      }
    }

    let garageId = undefined;
    if (roles.includes('garage')) {
      const garageResult = await query('SELECT id FROM garages WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
      if (garageResult.rows.length > 0) {
        garageId = garageResult.rows[0].id;
      }
    }

    const newAccessToken = generateAccessToken({ userId, email: user.email, name: user.name, roles, garageId });

    setTokensInCookies(res, newAccessToken, refreshToken);

    return success(res, { accessToken: newAccessToken, refreshToken, message: 'Token refreshed successfully' });
  } catch (err) {
    return error(res, err instanceof Error ? err.message : 'Invalid refresh token', 'UNAUTHORIZED', 401);
  }
});

authRouter.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (refreshToken) {
    try {
      await deleteRefreshTokenInDb(refreshToken);
    } catch (err) {
      console.warn('Failed to delete refresh token during logout:', err instanceof Error ? err.message : err);
    }
  }
  const { maxAge, ...clearConfig } = cookieConfig;
  res.clearCookie('accessToken', clearConfig);
  res.clearCookie('refreshToken', clearConfig);
  return success(res, { message: 'Logged out successfully' });
});

authRouter.get('/status', (_req, res) => {
  return success(res, { feature: 'auth', status: 'ready' });
});

authRouter.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return error(res, 'User ID missing in token', 'UNAUTHORIZED', 401);
    }
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return error(res, 'User not found', 'NOT_FOUND', 404);
    }
    const user = userResult.rows[0];
    const rolesResult = await query(
      'SELECT r.code FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1',
      [userId]
    );
    const roles = rolesResult.rows.map((row) => row.code);

    let garageName = undefined;
    let garageId = undefined;
    let garages: any[] = [];
    if (roles.includes('garage')) {
      const garageResult = await query('SELECT id, name FROM garages WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 100', [userId]);
      if (garageResult.rows.length > 0) {
        garages = garageResult.rows.map(g => ({ id: g.id, name: g.name }));
        garageId = garageResult.rows[0].id;
        garageName = garageResult.rows[0].name;
      }
    }

    const profileResult = await query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    const profile = profileResult.rows[0] || {};

    return success(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        garageId,
        garageName,
        garages,
        mobileNumber: user.mobile_number,
        status: user.status,
        roles,
        country: user.country,
        image: user.image || null,
        address: profile.address_line || '',
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.postal_code || '',
      },
    });
  } catch (err) {
    return error(res, 'Failed to fetch user', 'INTERNAL_SERVER_ERROR', 500);
  }
});

authRouter.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.userId;

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return error(res, 'Current and new passwords are required and must be text', 'BAD_REQUEST', 400);
  }

  if (!currentPassword || !newPassword) {
    return error(res, 'Current and new passwords are required', 'BAD_REQUEST', 400);
  }

  try {
    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return error(res, 'User not found', 'NOT_FOUND', 404);
    }

    const { password_hash } = userResult.rows[0];

    // Verify current password
    if (!password_hash || !bcrypt.compareSync(currentPassword, password_hash)) {
      return error(res, 'Invalid current password', 'UNAUTHORIZED', 401);
    }

    const temporaryPassword = getEnv().adminTemporaryPassword;
    if (temporaryPassword && newPassword === temporaryPassword) {
      return error(res, 'You cannot reuse the temporary password. Please choose a strong new password.', 'BAD_REQUEST', 400);
    }

    // Hash and update
    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    return success(res, { message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    return error(res, 'Failed to update password', 'INTERNAL_SERVER_ERROR', 500);
  }
});

import { Resend } from 'resend';
import { getDbPool } from '../../config/database';

// Resend is initialized lazily per-request using the checked env var — no dummy fallback.
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('EMAIL_NOT_CONFIGURED');
  return new Resend(apiKey);
}

// Forgot Password - Send Reset Link
authRouter.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return error(res, 'Valid email is required', 'VALIDATION_ERROR', 400);
    }
    const emailClean = email.trim().toLowerCase();

    // Generic anti-enumeration response
    const genericSuccess = () => success(res, { message: 'If an account with that email exists, a password reset link has been sent.' });

    const userRes = await query('SELECT id FROM users WHERE email = $1', [emailClean]);
    if (userRes.rows.length === 0) {
      return genericSuccess();
    }
    const userId = userRes.rows[0].id;

    // Rate limiting logic: Max 3 requests per hour
    const recentResets = await query(
      `SELECT COUNT(*) as count FROM password_resets WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );
    if (parseInt(recentResets.rows[0].count) >= 3) {
      return error(res, 'Too many password reset requests. Please try again later.', 'RATE_LIMIT_EXCEEDED', 429);
    }

    // Secure one-time token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error('Configuration Error: NEXT_PUBLIC_APP_URL is not defined in the environment.');
      return error(res, 'System configuration error: Frontend URL is missing. Please contact support.', 'CONFIG_ERROR', 500);
    }
    const resetUrl = `${appUrl}/login/reset-password?token=${rawToken}`;

    if (process.env.RESEND_API_KEY) {
      const senderEmail = process.env.RESEND_FROM_EMAIL || 'WrectifAI <noreply@wrectifai.com>';
      
      const { data, error: resendError } = await getResendClient().emails.send({
        from: senderEmail,
        to: emailClean,
        subject: 'WrectifAI - Password Reset',
        html: `
          <p>Hello,</p>
          <p>You requested to reset your password on WrectifAI.</p>
          <p>Click the link below to set a new password. This link expires in 1 hour.</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>If you did not request this, you can safely ignore this email.</p>
        `
      });

      if (resendError) {
        console.error('Resend API Error:', resendError);
        return error(res, 'Failed to send reset email. Please try again later or contact support.', 'EMAIL_SEND_FAILED', 500);
      }
    } else {
      console.error('Configuration Error: RESEND_API_KEY is not defined.');
      return error(res, 'Email provider is not configured. Please contact support.', 'CONFIG_ERROR', 500);
    }

    return genericSuccess();
  } catch (err) {
    console.error('Forgot password error:', err);
    return error(res, 'Failed to process forgot password request', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Reset Password
authRouter.post('/reset-password', async (req, res) => {
  const client = await getDbPool().connect();
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword || typeof token !== 'string' || typeof newPassword !== 'string') {
      return error(res, 'Valid token and new password are required', 'VALIDATION_ERROR', 400);
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return error(res, 'Password must be at least 8 characters with uppercase, lowercase, and a special character', 'BAD_REQUEST', 400);
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await client.query('BEGIN');

    const tokenRes = await client.query(
      `SELECT * FROM password_resets 
       WHERE token_hash = $1 AND used = false AND expires_at > NOW() FOR UPDATE`,
      [tokenHash]
    );

    if (tokenRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return error(res, 'Invalid or expired password reset token', 'INVALID_TOKEN', 400);
    }

    const resetRecord = tokenRes.rows[0];
    const userId = resetRecord.user_id;

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
    await client.query('UPDATE password_resets SET used = true WHERE user_id = $1', [userId]);

    await client.query('COMMIT');
    return success(res, { message: 'Password has been successfully reset. You can now login.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reset password error:', err);
    return error(res, 'Failed to reset password', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    client.release();
  }
});


