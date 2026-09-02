import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/database';

export const usersRouter = Router();

usersRouter.get('/', (_req, res) => {
  res.json([{ id: 'u_1', name: 'Wrectifai User' }]);
});

usersRouter.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);

    const { name, email, mobileNumber, image } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return error(res, 'Name is required', 'VALIDATION_ERROR', 400);
    }
    const emailToSave = email && email.trim() !== '' ? email.trim().toLowerCase() : null;

    if (emailToSave && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToSave)) {
      return error(res, 'A valid email is required', 'VALIDATION_ERROR', 400);
    }

    const phoneToSave = mobileNumber && mobileNumber.trim() !== '' ? mobileNumber.trim() : null;
    const imageToSave = image && typeof image === 'string' && image.trim() !== '' ? image.trim() : null;
    
    const result = await query(
      'UPDATE users SET name = $1, email = $2, mobile_number = $3, image = $4 WHERE id = $5 RETURNING id, email, name, mobile_number as "mobileNumber", image, status',
      [name.trim(), emailToSave, phoneToSave, imageToSave, userId]
    );

    if (result.rowCount === 0) {
      return error(res, 'User not found', 'NOT_FOUND', 404);
    }

    return success(res, result.rows[0]);
  } catch (err: any) {
    console.error('Failed to update profile', err);
    if (err.code === '23505') {
      if (err.constraint?.includes('email')) {
        return error(res, 'Email is already in use', 'CONFLICT', 409);
      }
      if (err.constraint?.includes('mobile_number')) {
        return error(res, 'Mobile number is already in use', 'CONFLICT', 409);
      }
      return error(res, 'Resource already exists', 'CONFLICT', 409);
    }
    return error(res, 'Internal error', 'INTERNAL_SERVER_ERROR', 500);
  }
});

usersRouter.get('/preferences/notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);

    const result = await query(
      'SELECT notification_preferences as "notificationPreferences" FROM profiles WHERE user_id = $1',
      [userId]
    );

    const prefs = result.rows[0]?.notificationPreferences || {
      enabled: true,
      inApp: true,
      email: true,
      sms: false
    };

    return success(res, prefs);
  } catch (err) {
    console.error('Failed to fetch notification preferences', err);
    return error(res, 'Internal error', 'INTERNAL_SERVER_ERROR', 500);
  }
});

usersRouter.put('/preferences/notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);

    const prefs = req.body;

    // Insert profile if not exists, otherwise update
    const result = await query(
      `INSERT INTO profiles (id, user_id, notification_preferences)
       VALUES (uuid_generate_v4(), $1, $2)
       ON CONFLICT (user_id) 
       DO UPDATE SET notification_preferences = EXCLUDED.notification_preferences
       RETURNING notification_preferences as "notificationPreferences"`,
      [userId, JSON.stringify(prefs)]
    );

    return success(res, result.rows[0]?.notificationPreferences);
  } catch (err) {
    console.error('Failed to update notification preferences', err);
    return error(res, 'Internal error', 'INTERNAL_SERVER_ERROR', 500);
  }
});

usersRouter.get('/customer/stats', authenticate, async (req, res) => {
  try {
    const customerId = req.user?.userId;
    if (!customerId) return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);


    // Active Bookings Count
    const bookingsRes = await query(`
      SELECT COUNT(*) as count, MIN(scheduled_at) as next_booking
      FROM bookings 
      WHERE customer_id = $1 AND status IN ('pendingPayment', 'confirmed', 'in_progress', 'pending', 'accepted')
    `, [customerId]);

    // Pending Quotes Count (Quote requests with actual quotes that are not booked)
    const quotesRes = await query(`
      SELECT COUNT(DISTINCT q.id) as count
      FROM quotes q
      JOIN quote_requests qr ON q.quote_request_id = qr.id
      WHERE qr.customer_id = $1 AND NOT EXISTS (
        SELECT 1 FROM bookings b WHERE b.quote_id = q.id
      ) AND q.status NOT IN ('rejected', 'cancelled', 'expired')
    `, [customerId]);


    // Vehicles Count
    const vehiclesRes = await query(`
      SELECT COUNT(*) as count FROM vehicles WHERE customer_id = $1
    `, [customerId]);

    return success(res, {
      bookingsCount: Number(bookingsRes.rows[0].count || 0),
      nextBooking: bookingsRes.rows[0].next_booking,
      quotesCount: Number(quotesRes.rows[0].count || 0),
      vehiclesCount: Number(vehiclesRes.rows[0].count || 0),
      ordersCount: 0
    });
  } catch (err) {
    console.error('Failed to fetch customer stats', err);
    return error(res, 'Internal error', 'INTERNAL_SERVER_ERROR', 500);
  }
});

usersRouter.get('/delivery-agents', authenticate, async (req, res) => {
  try {
    const agentsRes = await query(`
      SELECT u.id, u.name, u.email, u.mobile_number, u.image 
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.code = 'delivery_agent' AND u.status = 'active'
    `);
    
    return success(res, agentsRes.rows);
  } catch (err) {
    console.error('Failed to fetch delivery agents', err);
    return error(res, 'Internal error', 'INTERNAL_SERVER_ERROR', 500);
  }
});
