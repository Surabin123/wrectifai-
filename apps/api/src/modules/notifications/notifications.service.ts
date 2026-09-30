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
        // The original production schema requires channel, template_key, and
        // status. Provide the explicit in-app values so notification inserts
        // work against both the original schema and later migrations.
        const res = await query(`INSERT INTO notifications
          (user_id, garage_id, is_admin, type, title, description, channel, template_key, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'inApp', $7, 'sent') RETURNING *`,
          [userId || null, garageId || null, isAdmin, type, title, description, `inApp.${type}`]);
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
    if (isAdmin) await query(`UPDATE notifications SET is_read = TRUE WHERE id = $1 AND is_admin = TRUE`, [notificationId]);
    else if (garageId) await query(`UPDATE notifications SET is_read = TRUE WHERE id = $1 AND garage_id = $2`, [notificationId, garageId]);
    else if (userId) await query(`UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`, [notificationId, userId]);
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

  static async clearNotifications(ids: string[] | undefined, userId?: string, garageId?: string, isAdmin = false) {
    const scope: string[] = [];
    const params: unknown[] = [];
    if (isAdmin) scope.push('is_admin = TRUE');
    else if (garageId) { params.push(garageId); scope.push(`garage_id = $${params.length}`); }
    else if (userId) { params.push(userId); scope.push(`user_id = $${params.length}`); }
    else return;
    if (ids?.length) { params.push(ids); scope.push(`id = ANY($${params.length}::uuid[])`); }
    await query(`DELETE FROM notifications WHERE ${scope.join(' AND ')}`, params);
  }
}
