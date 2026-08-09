import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/database';

export const bookingsRouter = Router();

// GET /bookings — list all bookings globally
bookingsRouter.get('/', authenticate, async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    const userId = req.user?.userId;
    let filterCondition = '1=1';
    let params: any[] = [];
    
    if (!userRoles.includes('admin')) {
      if (userRoles.includes('garage')) {
        const garageId = req.user?.garageId;
        if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);
        
        filterCondition = 'b.garage_id = $1';
        params.push(garageId);
      } else {
        filterCondition = 'b.customer_id = $1';
        params.push(userId);
      }
    }

    const result = await query(
      `SELECT 
        b.id,
        b.customer_id as "customerId",
        b.garage_id as "garageId",
        b.vehicle_id as "vehicleId",
        b.quote_id as "quoteId",
        b.booking_type as "bookingType",
        b.scheduled_at as "scheduledAt",
        b.status,
        b.total_amount as "totalAmount",
        b.currency,
        b.created_at as "createdAt",
        b.updated_at as "updatedAt",
        g.name as "garageName",
        g.address as "garageAddress",
        v.make as "vehicleMake",
        v.model as "vehicleModel",
        v.year as "vehicleYear",
        v.vin as "vehicleVin",
        q.details->>'etaNote' as "estimatedDays",
        COALESCE(qr.issue_summary, b.customer_note) as "issueDescription",
        qr.preferred_date as "preferredDate",
        u.name as "customerName",
        u.mobile_number as "customerPhone",
        u.email as "customerEmail"
       FROM bookings b
       JOIN garages g ON b.garage_id = g.id
       JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN quotes q ON b.quote_id = q.id
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN users u ON b.customer_id = u.id
       WHERE ${filterCondition}
       ORDER BY b.scheduled_at DESC`,
      params
    );

    const formatted = result.rows.map((row) => ({
      ...row,
      status: row.status === 'inService' ? 'in_progress' : row.status,
      totalAmount: Number(row.totalAmount),
    }));

    return success(res, formatted, 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to retrieve bookings',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});


// Helper for booking creation logic
async function createBookingInternal(req: any, res: any, data: {
  garageId?: string;
  vehicleId: string;
  scheduledAt: string;
  totalAmount: number;
  bookingType: string;
  quoteId?: string | null;
  currency?: string;
  serviceType?: string;
}) {
  const customerId = req.user?.userId;
  let { garageId } = data;
  const { vehicleId, scheduledAt, totalAmount, bookingType, quoteId, currency, serviceType } = data;

  if (!vehicleId || !scheduledAt || totalAmount === undefined || !bookingType) {
    return error(res, 'Missing required booking fields', 'BAD_REQUEST', 400);
  }

  // If quoteId is provided, lookup the garageId from the quote if not provided
  if (quoteId) {
    try {
      const quoteResult = await query('SELECT garage_id FROM quotes WHERE id = $1', [quoteId]);
      if (quoteResult.rows.length > 0) {
        if (!garageId) {
          garageId = quoteResult.rows[0].garage_id;
        }
        // Update quote status to 'selected'
        await query("UPDATE quotes SET status = 'selected' WHERE id = $1", [quoteId]);
      }
    } catch (err) {
      console.error('Failed quote association processing:', err);
    }
  }

  if (!garageId) {
    return error(res, 'Garage ID is required to create a booking', 'BAD_REQUEST', 400);
  }

  const finalServiceType = serviceType || 'General Service';

  try {
    const result = await query(
      `INSERT INTO bookings (customer_id, garage_id, vehicle_id, quote_id, booking_type, scheduled_at, status, total_amount, currency, customer_note)
       VALUES ($1, $2, $3, $4, $5, $6, 'pendingPayment', $7, $8, $9)
       RETURNING id, customer_id as "customerId", garage_id as "garageId", vehicle_id as "vehicleId", quote_id as "quoteId", booking_type as "bookingType", scheduled_at as "scheduledAt", status, total_amount as "totalAmount", currency, created_at as "createdAt"`,
      [
        customerId,
        garageId,
        vehicleId,
        quoteId || null,
        bookingType,
        scheduledAt,
        totalAmount,
        currency || 'USD',
        finalServiceType
      ]
    );

    const row = result.rows[0];
    return success(
      res,
      {
        ...row,
        totalAmount: Number(row.totalAmount),
      },
      201
    );
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to create booking',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
}

// GET /bookings/garage-incoming — fetch pending bookings for a garage
bookingsRouter.get('/garage-incoming', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }
    const garageId = req.user?.garageId;
    if (!garageId) {
      return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);
    }

    const result = await query(
      `SELECT b.id, b.customer_id as "customerId", b.vehicle_id as "vehicleId", b.quote_id as "quoteId",
              b.scheduled_at as "scheduledAt", b.status, b.total_amount as "totalAmount", b.created_at as "createdAt",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear", v.vin as "vehicleVin",
              u.name as "customerName", u.mobile_number as "customerPhone", p.avatar_url as "customerAvatar",
              q.details as "quoteDetails", q.amount as "quoteAmount", q.details->>'etaNote' as "estimatedDays",
              qr.issue_summary as "issueSummary"
       FROM bookings b
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN users u ON b.customer_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN quotes q ON b.quote_id = q.id
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       WHERE b.garage_id = $1 AND b.status = 'pendingPayment'
       ORDER BY b.created_at DESC`,
      [garageId]
    );

    const formatted = result.rows.map((row) => ({
      ...row,
      totalAmount: Number(row.totalAmount || 0),
      quoteAmount: row.quoteAmount != null ? Number(row.quoteAmount) : null
    }));

    return success(res, formatted, 200);
  } catch (err) {
    return error(res, 'Failed to fetch incoming bookings', 'DATABASE_ERROR', 500);
  }
});

// POST /bookings — create a booking
bookingsRouter.post('/', authenticate, async (req, res) => {
  return createBookingInternal(req, res, req.body);
});

// POST /bookings/instant — legacy/instant booking alias
bookingsRouter.post('/instant', authenticate, async (req, res) => {
  const { garageId, vehicleId, scheduledAt, totalAmount, currency, serviceType } = req.body;
  return createBookingInternal(req, res, {
    garageId,
    vehicleId,
    scheduledAt,
    totalAmount,
    bookingType: 'instant',
    quoteId: null,
    currency,
    serviceType,
  });
});

// POST /bookings/from-quote/:quoteId — booking from quote alias
bookingsRouter.post('/from-quote/:quoteId', authenticate, async (req, res) => {
  try {
    const { quoteId } = req.params;
    let { vehicleId, vehicle, issueDescription, scheduledAt, totalAmount, currency, serviceType } = req.body;
    
    // Auto-fetch missing data from quote and quote_request
    const quoteResult = await query(
      `SELECT q.garage_id, q.total_cost, qr.vehicle_id, q.currency
       FROM quotes q 
       JOIN quote_requests qr ON q.quote_request_id = qr.id
       WHERE q.id = $1`, 
      [quoteId]
    );

    if (quoteResult.rows.length === 0) {
      return error(res, 'Quote not found', 'NOT_FOUND', 404);
    }
    
    const quoteData = quoteResult.rows[0];
    
    // Mark quote and quote_request as selected
    await query(`UPDATE quotes SET status = 'selected' WHERE id = $1`, [quoteId]);
    await query(`UPDATE quote_requests SET status = 'selected' WHERE id = (SELECT quote_request_id FROM quotes WHERE id = $1)`, [quoteId]);
    
    if (issueDescription) {
      await query(`UPDATE quote_requests SET issue_summary = $1 WHERE id = (SELECT quote_request_id FROM quotes WHERE id = $2)`, [issueDescription, quoteId]);
    }
    
    return createBookingInternal(req, res, {
      garageId: quoteData.garage_id,
      vehicleId: vehicleId || quoteData.vehicle_id,
      scheduledAt,
      totalAmount: totalAmount !== undefined ? totalAmount : quoteData.total_cost,
      bookingType: 'quoteBased',
      quoteId,
      currency: currency || quoteData.currency || 'USD',
      serviceType: issueDescription || serviceType || 'Quote Based Service',
    });
  } catch (err) {
    return error(res, 'Failed to process quote', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// GET /bookings/:bookingId — retrieve detailed booking by ID
bookingsRouter.get('/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const userRoles = req.user?.roles || [];
    const userId = req.user?.userId;
    let filterCondition = '1=1';
    let params: any[] = [bookingId];
    
    if (!userRoles.includes('admin')) {
      if (userRoles.includes('garage')) {
        const garageId = req.user?.garageId;
        if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);
        
        filterCondition = 'b.garage_id = $2';
        params.push(garageId);
      } else {
        filterCondition = 'b.customer_id = $2';
        params.push(userId);
      }
    }

    const result = await query(
      `SELECT 
        b.id,
        b.customer_id as "customerId",
        b.garage_id as "garageId",
        b.vehicle_id as "vehicleId",
        b.quote_id as "quoteId",
        b.booking_type as "bookingType",
        b.scheduled_at as "scheduledAt",
        b.status,
        b.total_amount as "totalAmount",
        b.currency,
        b.created_at as "createdAt",
        b.updated_at as "updatedAt",
        g.name as "garageName",
        g.address as "garageAddress",
        v.make as "vehicleMake",
        v.model as "vehicleModel",
        v.year as "vehicleYear",
        v.vin as "vehicleVin",
        q.details->>'etaNote' as "estimatedDays",
        COALESCE(qr.issue_summary, b.customer_note) as "issueDescription",
        qr.preferred_date as "preferredDate",
        u.name as "customerName",
        u.mobile_number as "customerPhone",
        u.email as "customerEmail"
       FROM bookings b
       JOIN garages g ON b.garage_id = g.id
       JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN quotes q ON b.quote_id = q.id
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN users u ON b.customer_id = u.id
       WHERE b.id = $1 AND ${filterCondition}`,
      params
    );

    if (result.rows.length === 0) {
      return error(res, 'Booking not found', 'NOT_FOUND', 404);
    }

    const row = result.rows[0];
    const formatted = {
      ...row,
      status: row.status === 'inService' ? 'in_progress' : row.status,
      totalAmount: Number(row.totalAmount),
    };

    return success(res, formatted, 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to retrieve booking',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

// PATCH /bookings/:bookingId/status — update status
bookingsRouter.patch('/:bookingId/status', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['pendingPayment', 'pending', 'confirmed', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'];
    if (!status || !allowedStatuses.includes(status)) {
      return error(res, `Invalid or missing status. Allowed values: ${allowedStatuses.join(', ')}`, 'BAD_REQUEST', 400);
    }

    const userRoles = req.user?.roles || [];
    let garageCheck = '';
    let params: any[] = [bookingId];

    if (!userRoles.includes('admin')) {
      if (userRoles.includes('garage')) {
        const garageId = req.user?.garageId;
        if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);
        garageCheck = ' AND garage_id = $2';
        params.push(garageId);
      } else {
        return error(res, 'Only garages and admins can update booking status', 'FORBIDDEN', 403);
      }
    }

    let dbStatus = status;
    if (status === 'pending') dbStatus = 'pendingPayment';
    if (status === 'accepted') dbStatus = 'confirmed';
    if (status === 'rejected') dbStatus = 'cancelled';
    if (status === 'in_progress') dbStatus = 'inService';

    const result = await query(
      `UPDATE bookings
       SET status = $${params.length + 1}, updated_at = NOW()
       WHERE id = $1${garageCheck}
       RETURNING id, status, updated_at as "updatedAt"`,
      [...params, dbStatus]
    );

    if (result.rows.length === 0) {
      return error(res, 'Booking not found', 'NOT_FOUND', 404);
    }

    return success(res, result.rows[0], 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to update booking status',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});
