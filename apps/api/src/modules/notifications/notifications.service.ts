import { query } from '../../config/database';

export class NotificationsService {
  static async createNotification({
    userId,
    garageId,
    isAdmin = false,
    type,
    title,
    description
  }: {
    userId?: string;
    garageId?: string;
    isAdmin?: boolean;
    type: string;
    title: string;
    description: string;
  }) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await query(`INSERT INTO notifications (user_id, garage_id, is_admin, type, title, description)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [userId || null, garageId || null, isAdmin, type, title, description]);
        return res.rows[0];
      } catch (error) {
        lastError = error;
        if (attempt === 2) throw error;
      }
    }
    throw lastError;
  }

  static async getUserNotifications(userId: string, page = 1, limit = 50) {
    const res = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, (page - 1) * limit]
    );
    return res.rows;
  }

  static async getGarageNotifications(garageId: string, page = 1, limit = 50) {
    const res = await query(
      `SELECT * FROM notifications 
       WHERE garage_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [garageId, limit, (page - 1) * limit]
    );
    return res.rows;
  }

  static async getAdminNotifications(page = 1, limit = 50) {
    const res = await query(
      `SELECT * FROM notifications 
       WHERE is_admin = TRUE
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, (page - 1) * limit]
    );
    return res.rows;
  }

  static async markAsRead(notificationId: string, userId?: string, garageId?: string, isAdmin = false) {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND
       (is_admin = $2 OR user_id = $3 OR garage_id = $4)`,
      [notificationId, isAdmin, userId || null, garageId || null]
    );
  }

  static async markAllAsRead(userId?: string, garageId?: string, isAdmin?: boolean) {
    if (userId) {
      await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [userId]);
    } else if (garageId) {
      await query(`UPDATE notifications SET is_read = TRUE WHERE garage_id = $1`, [garageId]);
    } else if (isAdmin) {
      await query(`UPDATE notifications SET is_read = TRUE WHERE is_admin = TRUE`);
    }
  }
}
