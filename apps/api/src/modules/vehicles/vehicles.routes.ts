import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/database';
import { VehicleImageService } from './vehicle-image.service';

export const vehiclesRouter = Router();

// GET /vehicles/image — get dynamic vehicle image
vehiclesRouter.get('/image', async (req, res) => {
  try {
    const { make, model, year } = req.query;
    if (!make || !model) {
      return res.status(400).json({ error: 'Make and model are required' });
    }
    
    const imageUrl = await VehicleImageService.getImageUrl(
      make as string, 
      model as string, 
      (year as string) || ''
    );
    
    return res.redirect(302, imageUrl);
  } catch (err) {
    console.error('[vehiclesRouter] image fetch error:', err);
    return res.status(404).json({ error: 'Vehicle image not found and generation failed' });
  }
});

// GET /vehicles — list all active vehicles
vehiclesRouter.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    let filterCondition = 'is_active = true';
    const params: any[] = [];

    if (!userRoles.includes('admin')) {
      filterCondition += ' AND customer_id = $1';
      params.push(userId);
    }

    const result = await query(
      `SELECT id, customer_id as "customerId", make, model, year, vin, mileage, warranty, image, plate_number as "plateNumber", created_at as "createdAt", updated_at as "updatedAt"
       FROM vehicles
       WHERE ${filterCondition}
       ORDER BY created_at DESC`,
      params
    );

    return success(res, result.rows, 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to retrieve vehicles',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

// POST /vehicles — add vehicle
vehiclesRouter.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return error(res, 'User ID missing from authentication token', 'UNAUTHORIZED', 401);
    }

    const { make, model, year, vin, mileage, warranty, image, plateNumber } = req.body;
    if (!make || !model || !year) {
      return error(res, 'Make, model, and year are required fields', 'BAD_REQUEST', 400);
    }

    const result = await query(
      `INSERT INTO vehicles (customer_id, make, model, year, vin, mileage, warranty, image, plate_number, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING id, customer_id as "customerId", make, model, year, vin, mileage, warranty, image, plate_number as "plateNumber", created_at as "createdAt", updated_at as "updatedAt"`,
      [userId, make, model, year, vin || null, mileage || null, warranty ? JSON.stringify(warranty) : null, image || null, plateNumber || null]
    );

    return success(res, result.rows[0], 201);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to add vehicle',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

// GET /vehicles/:vehicleId — get single vehicle details
vehiclesRouter.get('/:vehicleId', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { vehicleId } = req.params;

    if (!userId) {
      return error(res, 'User ID missing from authentication token', 'UNAUTHORIZED', 401);
    }

    const result = await query(
      `SELECT id, customer_id as "customerId", make, model, year, vin, mileage, warranty, image, plate_number as "plateNumber", created_at as "createdAt", updated_at as "updatedAt", is_active
       FROM vehicles
       WHERE id = $1`,
      [vehicleId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return error(res, 'Vehicle not found', 'NOT_FOUND', 404);
    }

    const vehicle = result.rows[0];

    // Ownership check
    if (!req.user?.roles?.includes('admin') && vehicle.customerId !== userId) {
      return error(res, 'Forbidden: You do not have access to this vehicle', 'FORBIDDEN', 403);
    }


    // Omit is_active in response matching design client
    const { is_active, ...vehicleData } = vehicle;
    return success(res, vehicleData, 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to retrieve vehicle',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

// PATCH /vehicles/:vehicleId — update vehicle
vehiclesRouter.patch('/:vehicleId', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { vehicleId } = req.params;

    if (!userId) {
      return error(res, 'User ID missing from authentication token', 'UNAUTHORIZED', 401);
    }

    // 1. Check ownership & existence
    const verifyResult = await query(
      `SELECT customer_id as "customerId", is_active FROM vehicles WHERE id = $1`,
      [vehicleId]
    );

    if (verifyResult.rows.length === 0 || !verifyResult.rows[0].is_active) {
      return error(res, 'Vehicle not found', 'NOT_FOUND', 404);
    }

    if (!req.user?.roles?.includes('admin') && verifyResult.rows[0].customerId !== userId) {
      return error(res, 'Forbidden: You do not have permission to modify this vehicle', 'FORBIDDEN', 403);
    }



    // 2. Perform partial update
    const { make, model, year, vin, mileage, warranty, image, plateNumber } = req.body;

    const result = await query(
      `UPDATE vehicles
       SET make = COALESCE($1, make),
           model = COALESCE($2, model),
           year = COALESCE($3, year),
           vin = COALESCE($4, vin),
           mileage = COALESCE($5, mileage),
           warranty = COALESCE($6, warranty),
           image = COALESCE($7, image),
           plate_number = COALESCE($8, plate_number),
           updated_at = NOW()
       WHERE id = $9
       RETURNING id, customer_id as "customerId", make, model, year, vin, mileage, warranty, image, plate_number as "plateNumber", created_at as "createdAt", updated_at as "updatedAt"`,
      [
        make !== undefined ? make : null,
        model !== undefined ? model : null,
        year !== undefined ? year : null,
        vin !== undefined ? vin : null,
        mileage !== undefined ? mileage : null,
        warranty !== undefined ? (warranty ? JSON.stringify(warranty) : null) : null,
        image !== undefined ? image : null,
        plateNumber !== undefined ? plateNumber : null,
        vehicleId,
      ]
    );

    return success(res, result.rows[0], 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to update vehicle',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

// DELETE /vehicles/:vehicleId — soft delete vehicle
vehiclesRouter.delete('/:vehicleId', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { vehicleId } = req.params;

    if (!userId) {
      return error(res, 'User ID missing from authentication token', 'UNAUTHORIZED', 401);
    }

    // 1. Check ownership & existence
    const verifyResult = await query(
      `SELECT customer_id as "customerId", is_active FROM vehicles WHERE id = $1`,
      [vehicleId]
    );

    if (verifyResult.rows.length === 0 || !verifyResult.rows[0].is_active) {
      return error(res, 'Vehicle not found', 'NOT_FOUND', 404);
    }

    if (!req.user?.roles?.includes('admin') && verifyResult.rows[0].customerId !== userId) {
      return error(res, 'Forbidden: You do not have permission to delete this vehicle', 'FORBIDDEN', 403);
    }



    // 2. Mark inactive
    await query(
      `UPDATE vehicles SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [vehicleId]
    );

    return success(res, { success: true }, 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to delete vehicle',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

