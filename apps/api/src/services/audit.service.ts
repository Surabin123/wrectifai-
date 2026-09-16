import { query } from '../config/database';

export interface AuditLogOptions {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditLogService {
  /**
   * Log a security or administrative event into the audit_logs table.
   * Fails silently in log warnings if database write fails to prevent breaking primary request flow.
   */
  static async logAction(options: AuditLogOptions): Promise<void> {
    try {
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          options.userId || null,
          options.action,
          options.resourceType,
          options.resourceId || null,
          options.details ? JSON.stringify(options.details) : null,
          options.ipAddress || null,
          options.userAgent || null,
        ]
      );
    } catch (err) {
      console.warn('[AuditLogService] Failed to record audit log:', err instanceof Error ? err.message : 'Unknown error');
    }
  }
}
