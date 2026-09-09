import { Router } from 'express';
import { success, error } from '../../utils/response';
import { query } from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { getPagination } from '../../utils/pagination';

export const productsRouter = Router();

// GET /api/v1/products - Fetch all available platform products
productsRouter.get('/', async (req, res) => {
  try {
    const { limit, offset } = getPagination(req);
    const result = await query(
      `SELECT id, name, category, description, price, is_diy_kit, image, compatible_vehicle_rules 
       FROM products 
       WHERE is_active = true 
       ORDER BY name ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return success(res, result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    return error(res, 'Failed to fetch products', 'DATABASE_ERROR', 500);
  }
});

// GET /api/v1/products/:id - Fetch product details and reviews
productsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const productResult = await query(
      `SELECT p.id, p.name, p.category, p.description,
              COALESCE(gi.price, p.price) AS price,
              COALESCE(gi.qty_available, 0) AS qty_available,
              p.is_diy_kit, p.image, p.compatible_vehicle_rules,
              gi.garage_id
       FROM products p
       LEFT JOIN garage_inventory gi ON gi.product_id = p.id AND gi.is_active = true AND gi.garage_id = $2
       WHERE p.id = $1 AND p.is_active = true`,
      [id, req.query.garageId || null]
    );

    if (productResult.rows.length === 0) {
      return error(res, 'Product not found', 'NOT_FOUND', 404);
    }

    const reviewsResult = await query(
      `SELECT r.id, r.rating, r.review_text, r.created_at, u.name as "first_name"
       FROM product_reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC LIMIT 100`,
      [id]
    );

    const product = productResult.rows[0];
    product.reviews = reviewsResult.rows;

    return success(res, product);
  } catch (err) {
    console.error('Error fetching product details:', err);
    return error(res, 'Failed to fetch product details', 'DATABASE_ERROR', 500);
  }
});

// POST /api/v1/products/:id/reviews - Submit a review
productsRouter.post('/:id/reviews', authenticate, async (req, res) => {
  const { id } = req.params;
  const { rating, review_text } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return error(res, 'Invalid rating (must be 1-5)', 'BAD_REQUEST', 400);
  }

  const actualUserId = req.user?.userId;

  if (!actualUserId) {
    return error(res, 'Unauthorized to leave a review', 'UNAUTHORIZED', 401);
  }

  try {
    const result = await query(
      `INSERT INTO product_reviews (product_id, user_id, rating, review_text)
       VALUES ($1, $2, $3, $4)
       RETURNING id, rating, review_text, created_at`,
      [id, actualUserId, rating, review_text || '']
    );

    return success(res, result.rows[0]);
  } catch (err) {
    console.error('Error submitting review:', err);
    return error(res, 'Failed to submit review', 'DATABASE_ERROR', 500);
  }
});
