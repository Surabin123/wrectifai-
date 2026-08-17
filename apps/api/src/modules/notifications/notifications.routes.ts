import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { NotificationsService } from './notifications.service';

export const notificationsRouter = Router();

// Get notifications based on role
notificationsRouter.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    
    if (!userId) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);
    }

    let notifications: any[] = [];

    if (userRoles.includes('admin')) {
      notifications = await NotificationsService.getAdminNotifications();
    } else if (userRoles.includes('garage')) {
      // Find garage ID if needed, but since we map user to garage, we need to pass garageId via query for now
      // Or if the user has garageId in token. Let's assume garageId is passed in query for garage role
      const garageId = req.query.garageId as string;
      if (garageId) {
        notifications = await NotificationsService.getGarageNotifications(garageId);
      } else {
        return error(res, 'Garage ID is required', 'BAD_REQUEST', 400);
      }
    } else {
      notifications = await NotificationsService.getUserNotifications(userId);
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
    await NotificationsService.markAsRead(req.params.id);
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
      const garageId = req.query.garageId as string;
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
