import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/database';
import { validateOffer } from './offers.service';

export const offersRouter = Router();

// GET /offers
offersRouter.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, code, title, description, discount_type, discount_value, max_discount, min_order_amount 
       FROM offers 
       WHERE active = true 
       AND (valid_until IS NULL OR valid_until > NOW())
       AND (valid_from <= NOW())`
    );
    return success(res, result.rows, 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to retrieve offers',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

// POST /offers/validate
offersRouter.post('/validate', authenticate, async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const userId = req.user?.userId;

    if (!code || subtotal === undefined) {
      return error(res, 'Offer code and subtotal are required', 'BAD_REQUEST', 400);
    }
    if (!userId) {
      return error(res, 'User ID is required', 'UNAUTHORIZED', 401);
    }

    const validation = await validateOffer(code, userId, Number(subtotal));
    return success(res, validation, 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Offer validation failed',
      'BAD_REQUEST',
      400
    );
  }
});
