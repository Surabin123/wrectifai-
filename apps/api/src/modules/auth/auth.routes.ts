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
    const roleResult = await query("SELECT id FROM roles WHERE code = 'user'");
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

  const accessToken = generateAccessToken({ userId: user.id, email: user.email, name: user.name, roles, garageId });
  const refreshToken = generateRefreshToken({ userId: user.id });

  await storeRefreshToken(user.id, refreshToken);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      mobileNumber: user.mobile_number,
      status: user.status,
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

authRouter.post('/register', async (req, res, next) => {
  const { mobileNumber, name, otp, role = 'user' } = req.body;
  if (!mobileNumber || !name || !otp) {
    return error(res, 'Phone number, name, and OTP are required', 'BAD_REQUEST', 400);
  }

  if (otp !== '123456') {
    return error(res, 'Invalid phone number or OTP', 'UNAUTHORIZED', 401);
  }

  try {
    const existingUser = await query('SELECT * FROM users WHERE mobile_number = $1', [mobileNumber]);
    let user;
    let isNew = false;
    
    if (existingUser.rows.length > 0) {
      user = existingUser.rows[0];
      await query('UPDATE users SET name = $1 WHERE id = $2', [name, user.id]);
      user.name = name;
    } else {
      const userResult = await query(
        "INSERT INTO users (mobile_number, name, status) VALUES ($1, $2, 'active') RETURNING id, email, name, mobile_number, status",
        [mobileNumber, name]
      );
      user = userResult.rows[0];
      isNew = true;
    }

    if (isNew) {
      const resolvedRole = role === 'customer' ? 'user' : role;
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

    return success(res, {
      user: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobile_number,
        status: user.status,
        roles,
      }
    }, 201);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  const { mobileNumber, otp, provider, email, password } = req.body;

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
      if (process.env.DEMO_MODE === 'true' && otp === '123456') {
        const existingUser = await query('SELECT * FROM users WHERE mobile_number = $1', [mobileNumber]);
        
        if (existingUser.rows.length > 0) {
          user = existingUser.rows[0];
          if (mobileNumber === '9876543210') {
            user.name = 'User';
          }
        } else if (mobileNumber === '9876543210') {
          const userResult = await query(
            "INSERT INTO users (mobile_number, name, status) VALUES ($1, $2, 'active') RETURNING id, mobile_number, name, status",
            [mobileNumber, 'User']
          );
          user = userResult.rows[0];
          const roleResult = await query("SELECT id FROM roles WHERE code = 'user'");
          if (roleResult.rows.length > 0) {
            await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, roleResult.rows[0].id]);
          }
        } else {
          return error(res, 'Demo account not found in database.', 'UNAUTHORIZED', 401);
        }
      } else {
        if (!mobileNumber || !otp) {
          return error(res, 'Phone number and OTP are required', 'BAD_REQUEST', 400);
        }
        // For normal production OTP verification (if ever implemented):
        return error(res, 'OTP login is currently disabled in production.', 'UNAUTHORIZED', 401);
      }
    }

    const rolesResult = await query(
      'SELECT r.code FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1',
      [user.id]
    );
    const roles = rolesResult.rows.map((row) => row.code);

    let garageName = undefined;
    let garageId = undefined;
    if (roles.includes('garage')) {
      const garageResult = await query('SELECT id, name FROM garages WHERE owner_user_id = $1', [user.id]);
      if (garageResult.rows.length > 0) {
        garageId = garageResult.rows[0].id;
        garageName = garageResult.rows[0].name;
      }
    }

    const requiresPasswordChange = checkIfPasswordResetRequired(user.password_hash, roles);

    const accessToken = generateAccessToken({ userId: user.id, email: user.email, name: user.name, roles, garageId });
    const refreshToken = generateRefreshToken({ userId: user.id });

    await storeRefreshToken(user.id, refreshToken);

    setTokensInCookies(res, accessToken, refreshToken);

    return success(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        garageName,
        mobileNumber: user.mobile_number,
        status: user.status,
        roles,
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

    await deleteRefreshTokenInDb(refreshToken);

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

    let garageId = undefined;
    if (roles.includes('garage')) {
      const garageResult = await query('SELECT id FROM garages WHERE owner_user_id = $1', [userId]);
      if (garageResult.rows.length > 0) {
        garageId = garageResult.rows[0].id;
      }
    }

    const newAccessToken = generateAccessToken({ userId, email: user.email, name: user.name, roles, garageId });
    const newRefreshToken = generateRefreshToken({ userId });

    await storeRefreshToken(userId, newRefreshToken);

    setTokensInCookies(res, newAccessToken, newRefreshToken);

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
    if (roles.includes('garage')) {
      const garageResult = await query('SELECT name FROM garages WHERE owner_user_id = $1', [userId]);
      if (garageResult.rows.length > 0) {
        garageName = garageResult.rows[0].name;
      }
    }

    return success(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        garageName,
        mobileNumber: user.mobile_number,
        status: user.status,
        roles,
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


