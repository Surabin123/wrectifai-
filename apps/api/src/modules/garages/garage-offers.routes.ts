import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate, requireRole } from '../../middleware/auth';
import { query } from '../../config/database';

export const garageOffersRouter = Router({ mergeParams: true });

// GET /garages/my-offers
garageOffersRouter.get('/my-offers', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = req.user?.garageId;
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const result = await query(
      `SELECT id, code, title, description, discount_type, discount_value, max_discount, min_order_amount,
              valid_from, valid_until, usage_limit, per_user_limit, active, offer_type, applicable_item_id, terms_conditions
       FROM offers 
       WHERE garage_id = $1 AND is_deleted = false
       ORDER BY created_at DESC`,
      [garageId]
    );

    return success(res, result.rows);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to fetch offers', 'DATABASE_ERROR', 500);
  }
});

// POST /garages/my-offers
garageOffersRouter.post('/my-offers', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = req.user?.garageId;
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { 
      code, title, description, discount_type, discount_value, max_discount, 
      min_order_amount, valid_from, valid_until, usage_limit, per_user_limit, 
      active, offer_type, applicable_item_id, terms_conditions 
    } = req.body;

    if (!code || !title || !discount_type || discount_value === undefined) {
      return error(res, 'Missing required fields', 'BAD_REQUEST', 400);
    }

    if (applicable_item_id) {
      // Validate ownership of applicable_item_id
      let valid = false;
      if (offer_type === 'SERVICE') {
         const s = await query(`SELECT id FROM services WHERE id = $1 AND garage_id = $2`, [applicable_item_id, garageId]);
         valid = s.rows.length > 0;
      } else if (offer_type === 'PARTS') {
         const p = await query(`SELECT id FROM garage_inventory WHERE id = $1 AND garage_id = $2`, [applicable_item_id, garageId]);
         valid = p.rows.length > 0;
      } else if (offer_type === 'COMBO') {
         // Could be service or part, check both
         const s = await query(`SELECT id FROM services WHERE id = $1 AND garage_id = $2`, [applicable_item_id, garageId]);
         const p = await query(`SELECT id FROM garage_inventory WHERE id = $1 AND garage_id = $2`, [applicable_item_id, garageId]);
         valid = s.rows.length > 0 || p.rows.length > 0;
      }
      if (!valid) {
        return error(res, 'Applicable item not found or does not belong to this garage', 'BAD_REQUEST', 400);
      }
    }

    const result = await query(
      `INSERT INTO offers (
        garage_id, code, title, description, discount_type, discount_value, max_discount, 
        min_order_amount, valid_from, valid_until, usage_limit, per_user_limit, active, 
        offer_type, applicable_item_id, terms_conditions
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()), $10, $11, $12, COALESCE($13, true), $14, $15, $16)
       RETURNING *`,
      [
        garageId, code, title, description, discount_type, discount_value, max_discount || null, 
        min_order_amount || 0, valid_from || null, valid_until || null, usage_limit || null, 
        per_user_limit || 1, active !== undefined ? active : true, 
        offer_type || 'SERVICE', applicable_item_id || null, terms_conditions || null
      ]
    );

    return success(res, result.rows[0], 201);
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') {
       return error(res, 'Offer code already exists', 'CONFLICT', 409);
    }
    return error(res, 'Failed to create offer', 'DATABASE_ERROR', 500);
  }
});

// PUT /garages/my-offers/:id
garageOffersRouter.put('/my-offers/:id', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = req.user?.garageId;
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const { 
      code, title, description, discount_type, discount_value, max_discount, 
      min_order_amount, valid_from, valid_until, usage_limit, per_user_limit, 
      active, offer_type, applicable_item_id, terms_conditions 
    } = req.body;

    if (applicable_item_id) {
      let valid = false;
      if (offer_type === 'SERVICE') {
         const s = await query(`SELECT id FROM services WHERE id = $1 AND garage_id = $2`, [applicable_item_id, garageId]);
         valid = s.rows.length > 0;
      } else if (offer_type === 'PARTS') {
         const p = await query(`SELECT id FROM garage_inventory WHERE id = $1 AND garage_id = $2`, [applicable_item_id, garageId]);
         valid = p.rows.length > 0;
      } else if (offer_type === 'COMBO') {
         const s = await query(`SELECT id FROM services WHERE id = $1 AND garage_id = $2`, [applicable_item_id, garageId]);
         const p = await query(`SELECT id FROM garage_inventory WHERE id = $1 AND garage_id = $2`, [applicable_item_id, garageId]);
         valid = s.rows.length > 0 || p.rows.length > 0;
      }
      if (!valid) {
        return error(res, 'Applicable item not found or does not belong to this garage', 'BAD_REQUEST', 400);
      }
    }

    const result = await query(
      `UPDATE offers 
       SET code = COALESCE($1, code),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           discount_type = COALESCE($4, discount_type),
           discount_value = COALESCE($5, discount_value),
           max_discount = $6,
           min_order_amount = COALESCE($7, min_order_amount),
           valid_from = COALESCE($8, valid_from),
           valid_until = $9,
           usage_limit = $10,
           per_user_limit = COALESCE($11, per_user_limit),
           active = COALESCE($12, active),
           offer_type = COALESCE($13, offer_type),
           applicable_item_id = $14,
           terms_conditions = $15,
           updated_at = NOW()
       WHERE id = $16 AND garage_id = $17 AND is_deleted = false
       RETURNING *`,
      [
        code, title, description, discount_type, discount_value, max_discount || null, 
        min_order_amount, valid_from, valid_until || null, usage_limit || null, 
        per_user_limit, active, offer_type, applicable_item_id || null, terms_conditions || null,
        req.params.id, garageId
      ]
    );

    if (result.rows.length === 0) {
      return error(res, 'Offer not found or unauthorized', 'NOT_FOUND', 404);
    }

    return success(res, result.rows[0]);
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') {
       return error(res, 'Offer code already exists', 'CONFLICT', 409);
    }
    return error(res, 'Failed to update offer', 'DATABASE_ERROR', 500);
  }
});

// DELETE /garages/my-offers/:id
garageOffersRouter.delete('/my-offers/:id', authenticate, async (req, res) => {
  try {
    if (!req.user?.roles?.includes('garage')) return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    const garageId = req.user?.garageId;
    if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

    const result = await query(
      `UPDATE offers SET is_deleted = true, active = false, updated_at = NOW() WHERE id = $1 AND garage_id = $2 RETURNING id`,
      [req.params.id, garageId]
    );

    if (result.rows.length === 0) {
      return error(res, 'Offer not found or unauthorized', 'NOT_FOUND', 404);
    }

    return success(res, { message: 'Offer removed successfully' });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to remove offer', 'DATABASE_ERROR', 500);
  }
});
