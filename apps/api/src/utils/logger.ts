import { getEnv } from '../config/env';

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'passwordhash',
  'password_hash',
  'otp',
  'code',
  'accesstoken',
  'refreshtoken',
  'token',
  'jwt',
  'authorization',
  'cookie',
  'cookies',
  'razorpay_signature',
  'key_secret',
  'secret',
  'webhooksecret',
  'apikey',
  'api_key',
  'creditcard',
  'cvv',
  'ssn',
]);

function redact(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redact);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = redact(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

class Logger {
  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const env = getEnv();
    const sanitizedMeta = meta ? redact(meta) : undefined;

    if (env.nodeEnv === 'production') {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...(sanitizedMeta ? { meta: sanitizedMeta } : {}),
      });
    }

    const metaStr = sanitizedMeta ? ` ${JSON.stringify(sanitizedMeta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}`;
  }

  info(message: string, meta?: any) {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: any) {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, meta?: any) {
    console.error(this.formatMessage('error', message, meta));
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger = new Logger();
