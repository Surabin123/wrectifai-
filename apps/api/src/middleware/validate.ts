import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { error } from '../utils/response';

interface ValidationSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validateRequest(schemas: ValidationSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as any;
      }
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as any;
      }
      if (schemas.body) {
        req.body = (await schemas.body.parseAsync(req.body)) as any;
      }
      next();
    } catch (err: any) {
      if (err && Array.isArray(err.issues)) {
        const issues = err.issues.map((e: any) => `${e.path ? e.path.join('.') : 'input'}: ${e.message}`).join(', ');
        const details = err.issues.map((e: any) => ({
          field: e.path ? e.path.join('.') : 'input',
          message: e.message,
        }));
        return error(res, `Validation failed: ${issues}`, 'VALIDATION_ERROR', 400, details);
      }
      return error(res, err.message || 'Invalid request input', 'BAD_REQUEST', 400);
    }
  };
}
