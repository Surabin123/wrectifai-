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
    const res = await query(
      `INSERT INTO notifications (user_id, garage_id, is_admin, type, title, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId || null, garageId || null, isAdmin, type, title, description]
    );
    return res.rows[0];
  }

  static async getUserNotifications(userId: string) {
    const res = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    return res.rows;
  }

  static async getGarageNotifications(garageId: string) {
    const res = await query(
      `SELECT * FROM notifications 
       WHERE garage_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [garageId]
    );
    return res.rows;
  }

  static async getAdminNotifications() {
    const res = await query(
      `SELECT * FROM notifications 
       WHERE is_admin = TRUE
       ORDER BY created_at DESC LIMIT 50`
    );
    return res.rows;
  }

  static async markAsRead(notificationId: string) {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1`,
      [notificationId]
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
