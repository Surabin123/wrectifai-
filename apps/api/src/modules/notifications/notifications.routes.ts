import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { NotificationsService } from './notifications.service';
import { query } from '../../config/database';

export const notificationsRouter = Router();

// Get notifications based on role
notificationsRouter.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '50'), 10) || 50));
    
    if (!userId) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);
    }

    let notifications: any[] = [];

    if (userRoles.includes('admin')) {
      notifications = await NotificationsService.getAdminNotifications(page, limit);
    } else if (userRoles.includes('garage')) {
      // Find garage ID if needed, but since we map user to garage, we need to pass garageId via query for now
      // Or if the user has garageId in token. Let's assume garageId is passed in query for garage role
      const garageRes = await query('SELECT id FROM garages WHERE owner_user_id = $1 LIMIT 1', [userId]);
      const garageId = garageRes.rows[0]?.id;
      if (garageId) {
        notifications = await NotificationsService.getGarageNotifications(garageId, page, limit);
      } else {
        return error(res, 'Garage ID is required', 'BAD_REQUEST', 400);
      }
    } else {
      notifications = await NotificationsService.getUserNotifications(userId, page, limit);
    }

    return success(res, notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return error(res, 'Failed to fetch notifications', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Mark notification as read
notificationsRouter.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const roles = req.user?.roles || [];
    const garageRes = userId && roles.includes('garage')
      ? await query('SELECT id FROM garages WHERE owner_user_id = $1 LIMIT 1', [userId])
      : { rows: [] };
    await NotificationsService.markAsRead(req.params.id, userId, garageRes.rows[0]?.id, roles.includes('admin'));
    return success(res, { success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return error(res, 'Failed to update notification', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Mark all as read
notificationsRouter.post('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    
    if (userRoles.includes('admin')) {
      await NotificationsService.markAllAsRead(undefined, undefined, true);
    } else if (userRoles.includes('garage')) {
      const garageRes = await query('SELECT id FROM garages WHERE owner_user_id = $1 LIMIT 1', [userId]);
      const garageId = garageRes.rows[0]?.id;
      if (!garageId) return error(res, 'Garage not found for this user', 'FORBIDDEN', 403);
      await NotificationsService.markAllAsRead(undefined, garageId, undefined);
    } else {
      await NotificationsService.markAllAsRead(userId, undefined, undefined);
    }
    
    return success(res, { success: true });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return error(res, 'Failed to update notifications', 'INTERNAL_SERVER_ERROR', 500);
  }
});
