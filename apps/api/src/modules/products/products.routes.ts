import { Router } from 'express';
import { success, error } from '../../utils/response';
import { query } from '../../config/database';

export const productsRouter = Router();

// GET /api/v1/products - Fetch all available platform products
productsRouter.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, category, description, price, is_diy_kit, image, compatible_vehicle_rules 
       FROM products 
       WHERE is_active = true 
       ORDER BY name ASC`
    );

    return success(res, result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    return error(res, 'Failed to fetch products', 'DATABASE_ERROR', 500);
  }
});
