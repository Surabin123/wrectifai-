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
      `SELECT o.id, o.code, o.title, o.description, o.discount_type, o.discount_value, 
              o.max_discount, o.min_order_amount, o.valid_from, o.valid_until, 
              o.offer_type, o.applicable_item_id, o.terms_conditions,
              g.name as "garageName"
       FROM offers o
       LEFT JOIN garages g ON o.garage_id = g.id
       WHERE o.active = true 
       AND o.is_deleted = false
       AND (o.valid_until IS NULL OR o.valid_until > NOW())
       AND (o.valid_from IS NULL OR o.valid_from <= NOW())
       ORDER BY o.created_at DESC`
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
    const { code, subtotal, garageId } = req.body;
    const userId = req.user?.userId;

    if (!code || subtotal === undefined) {
      return error(res, 'Offer code and subtotal are required', 'BAD_REQUEST', 400);
    }
    if (!userId) {
      return error(res, 'User ID is required', 'UNAUTHORIZED', 401);
    }

    const validation = await validateOffer(code, userId, Number(subtotal), garageId);
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
