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
import { query } from '../../config/database';
import * as bcrypt from 'bcryptjs';
import { authenticate, requireRole } from '../../middleware/auth';
import { CookieOptions, Response } from 'express';
import { NotificationsService } from '../notifications/notifications.service';

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

// Modular function to encapsulate password reset detection logic.
// In the future, this can be swapped to check a database flag like `user.requires_password_reset`.
function checkIfPasswordResetRequired(passwordHash: string, userRoles: string[]): boolean {
  if (userRoles.includes('admin') && passwordHash) {
    // If the hash matches the temporary password, require a change.
    return bcrypt.compareSync('Admin@12345', passwordHash);
  }
  return false;
}


const HARDCODED_PHONES = ['9876543210', '1234567890'];

// Helper to register/login a user from a verified OAuth profile (Google, Apple, etc.)
export async function handleUserLoginOrRegister(email: string, name: string) {
  if (email) email = email.toLowerCase();
  let user;
  let isNew = false;

  const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    user = existingUser.rows[0];
  } else {
    const userResult = await query(
      "INSERT INTO users (email, name, status) VALUES ($1, $2, 'active') RETURNING id, email, name, mobile_number, status",
      [email, name]
    );
    user = userResult.rows[0];
    isNew = true;
  }

  if (isNew) {
    const roleResult = await query("SELECT id FROM roles WHERE code = 'customer'");
    if (roleResult.rows.length > 0) {
      const roleId = roleResult.rows[0].id;
      await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, roleId]);
    }
  }

  const rolesResult = await query(
    'SELECT r.code FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1',
    [user.id]
  );
  const roles = rolesResult.rows.map((row) => row.code);

  // Fallback: If existing user has no roles (e.g. DB was reset or user pre-dates RBAC),
  // auto-assign the 'user' role so they are never locked out.
  if (roles.length === 0) {
    const defaultRole = await query("SELECT id, code FROM roles WHERE code = 'customer'");
    if (defaultRole.rows.length > 0) {
      await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, defaultRole.rows[0].id]);
      roles.push(defaultRole.rows[0].code);
    }
  }

  let garageId = undefined;
  if (roles.includes('garage')) {
    const garageResult = await query('SELECT id FROM garages WHERE owner_user_id = $1', [user.id]);
    if (garageResult.rows.length > 0) {
      garageId = garageResult.rows[0].id;
    }
  }

  const accessToken = generateAccessToken({ userId: user.id, email: user.email, name: user.name, roles, garageId });
  const refreshToken = generateRefreshToken({ userId: user.id });

  await storeRefreshToken(user.id, refreshToken);

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
    const authResult = await handleUserLoginOrRegister(googlePayload.email, googlePayload.name);
    
    setTokensInCookies(res, authResult.accessToken, authResult.refreshToken);
    
    return success(res, { user: authResult.user }, 200);
  } catch (err) {
    return error(res, err instanceof Error ? err.message : 'Google authentication failed', 'UNAUTHORIZED', 401);
  }
});

authRouter.post('/check-user', async (req, res, next) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber) {
    return error(res, 'Phone number is required', 'BAD_REQUEST', 400);
  }

  try {
    const existingUser = await query("SELECT id FROM users WHERE mobile_number LIKE '%' || $1", [mobileNumber]);
    return success(res, { exists: existingUser.rows.length > 0 }, 200);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/register', async (req, res, next) => {
  let { mobileNumber, name, otp, email, password, role = 'customer', country } = req.body;
  if (email) email = email.toLowerCase();
  
  if (!name) {
    return error(res, 'Name is required', 'BAD_REQUEST', 400);
  }

  try {
    let user;
    let isNew = false;
    
    if (email && password) {
      // Email/Password Registration Flow
      const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return error(res, 'Account already exists with this email. Please sign in.', 'CONFLICT', 409);
      }
      
      if (mobileNumber) {
        const existingPhone = await query('SELECT * FROM users WHERE mobile_number = $1', [mobileNumber]);
        if (existingPhone.rows.length > 0) {
          return error(res, 'Account already exists with this phone number. Please sign in.', 'CONFLICT', 409);
        }
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const userResult = await query(
        "INSERT INTO users (email, name, password_hash, mobile_number, status) VALUES ($1, $2, $3, $4, 'active') RETURNING id, email, name, mobile_number, status",
        [email, name, hashedPassword, mobileNumber || null]
      );
      user = userResult.rows[0];
      isNew = true;
    } else {
      // Phone OTP Registration Flow
      if (!mobileNumber || !otp) {
        return error(res, 'Phone number and OTP are required', 'BAD_REQUEST', 400);
      }

      if (otp !== '1234' && otp !== '123456') {
        return error(res, 'Invalid phone number or OTP', 'UNAUTHORIZED', 401);
      }

      const existingUser = await query("SELECT * FROM users WHERE mobile_number LIKE '%' || $1", [mobileNumber]);
      if (existingUser.rows.length > 0) {
        return error(res, 'Account already exists with this phone number. Please sign in.', 'CONFLICT', 409);
      }
      
      const userResult = await query(
        "INSERT INTO users (mobile_number, name, status) VALUES ($1, $2, 'active') RETURNING id, email, name, mobile_number, status",
        [mobileNumber, name]
      );
      user = userResult.rows[0];
      isNew = true;
    }

    if (isNew) {
      const resolvedRole = (role === 'customer' || role === 'user') ? 'customer' : role;
      const roleResult = await query('SELECT id FROM roles WHERE code = $1', [resolvedRole]);
      if (roleResult.rows.length > 0) {
        const roleId = roleResult.rows[0].id;
        await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, roleId]);
      }
    }

    const rolesResult = await query(
      'SELECT r.code FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1',
      [user.id]
    );
    const roles = rolesResult.rows.map((row) => row.code);

    let garageId = undefined;
    if (roles.includes('garage')) {
      const garageResult = await query('SELECT id FROM garages WHERE owner_user_id = $1', [user.id]);
      if (garageResult.rows.length > 0) {
        garageId = garageResult.rows[0].id;
      }
    }

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
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  let { mobileNumber, otp, provider, email, password } = req.body;
  if (email) email = email.toLowerCase();

  try {
    let user;
    let isNew = false;

    if (provider) {
      if (provider !== 'google' && provider !== 'apple') {
        return error(res, 'Invalid OAuth provider', 'BAD_REQUEST', 400);
      }

      // For a production app, verify OAuth token against provider (Google/Apple)
      // For now, if no real provider verification is passed via /google endpoint, reject it.
      return error(res, 'Direct provider mock login is disabled in production.', 'UNAUTHORIZED', 401);
    } else if (email && password) {
      // Email/Password login (primarily for Admin)
      const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length === 0) {
        return error(res, 'Invalid email or password', 'UNAUTHORIZED', 401);
      }
      user = existingUser.rows[0];
      
      if (!user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
        return error(res, 'Invalid email or password', 'UNAUTHORIZED', 401);
      }
    } else {
      if (!mobileNumber || !otp) {
        return error(res, 'Phone number and OTP are required', 'BAD_REQUEST', 400);
      }
      
      if (otp === '1234' || otp === '123456') {
        const existingUser = await query("SELECT * FROM users WHERE mobile_number LIKE '%' || $1", [mobileNumber]);
        
        if (existingUser.rows.length > 0) {
          user = existingUser.rows[0];
          // Update name if they login with the special demo number
          if (mobileNumber === '9876543210') {
            user.name = user.name || 'User';
          }
          // Sync the selected country from the login form
          const countryToSave = req.body.country || 'IN';
          if (user.country !== countryToSave) {
            await query('UPDATE users SET country = $1 WHERE id = $2', [countryToSave, user.id]);
            user.country = countryToSave;
          }
        } else {
          // If user doesn't exist, auto-register them
          isNew = true;
          const userResult = await query(
            "INSERT INTO users (mobile_number, name, status, country) VALUES ($1, $2, 'active', $3) RETURNING id, mobile_number, name, status, country",
            [mobileNumber, mobileNumber === '9876543210' ? 'User' : 'Customer', req.body.country || 'IN']
          );
          user = userResult.rows[0];
          const roleResult = await query("SELECT id FROM roles WHERE code = 'customer'");
          if (roleResult.rows.length > 0) {
            await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, roleResult.rows[0].id]);
          }
        }
      } else {
        return error(res, 'Invalid phone number or OTP', 'UNAUTHORIZED', 401);
      }
    }

    const rolesResult = await query(
      'SELECT r.code FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1',
      [user.id]
    );
    const roles = rolesResult.rows.map((row) => row.code);

    // Fallback: If user has no roles (e.g. created before RBAC enforcement), assign 'customer' role
    if (roles.length === 0) {
      const defaultRole = await query("SELECT id, code FROM roles WHERE code = 'customer'");
      if (defaultRole.rows.length > 0) {
        await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, defaultRole.rows[0].id]);
        roles.push(defaultRole.rows[0].code);
      }
    }

    let garageName = undefined;
    let garageId = undefined;
    let garages: any[] = [];
    if (roles.includes('garage')) {
      const garageResult = await query('SELECT id, name FROM garages WHERE owner_user_id = $1 ORDER BY created_at DESC', [user.id]);
      if (garageResult.rows.length > 0) {
        garages = garageResult.rows.map(g => ({ id: g.id, name: g.name }));
        garageId = garageResult.rows[0].id;
        garageName = garageResult.rows[0].name;
      }
    }

    const requiresPasswordChange = checkIfPasswordResetRequired(user.password_hash, roles);

    const accessToken = generateAccessToken({ userId: user.id, email: user.email, name: user.name, roles, garageId });
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
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
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
      const garageResult = await query('SELECT id FROM garages WHERE owner_user_id = $1', [userId]);
      if (garageResult.rows.length > 0) {
        garageId = garageResult.rows[0].id;
      }
    }

    const newAccessToken = generateAccessToken({ userId, email: user.email, name: user.name, roles, garageId });

    setTokensInCookies(res, newAccessToken, refreshToken);

    return success(res, { message: 'Token refreshed successfully' });
  } catch (err) {
    return error(res, err instanceof Error ? err.message : 'Invalid refresh token', 'UNAUTHORIZED', 401);
  }
});

authRouter.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
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
      const garageResult = await query('SELECT id, name FROM garages WHERE owner_user_id = $1 ORDER BY created_at DESC', [userId]);
      if (garageResult.rows.length > 0) {
        garages = garageResult.rows.map(g => ({ id: g.id, name: g.name }));
        garageId = garageResult.rows[0].id;
        garageName = garageResult.rows[0].name;
      }
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
    });
  } catch (err) {
    return error(res, 'Failed to fetch user', 'INTERNAL_SERVER_ERROR', 500);
  }
});

authRouter.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.userId;

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

    // Prevent reuse of the temporary password
    if (newPassword === 'Admin@12345') {
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

import * as crypto from 'crypto';
import { Resend } from 'resend';
import { getDbPool } from '../../config/database';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

// Forgot Password - Send Reset Link
authRouter.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return error(res, 'Email is required', 'VALIDATION_ERROR', 400);
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/login/reset-password?token=${rawToken}`;

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'WrectifAI <noreply@wrectifai.com>',
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
    } else {
      console.log(`[Dev] Forgot Password link for ${emailClean}: ${resetUrl}`);
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
    
    if (!token || !newPassword) {
      return error(res, 'Token and new password are required', 'VALIDATION_ERROR', 400);
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


