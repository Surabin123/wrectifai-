import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/database';

export const quotesRouter = Router();

quotesRouter.get('/', authenticate, async (req, res) => {
  try {
    const customerId = req.user?.userId;
    if (!customerId) {
      return error(res, 'Authentication failed: no customer ID found', 'UNAUTHORIZED', 401);
    }

    const result = await query(
      `SELECT q.id, q.quote_request_id as "quoteRequestId", q.amount, q.currency, q.eta_days as "etaDays", q.status, q.created_at as "createdAt", q.details,
              q.details->>'laborCost' as "laborCost", q.details->>'partsCost' as "partsCost", q.details->>'totalCost' as "totalCost", q.details->>'etaNote' as "etaNote",
              g.name as "garageName", g.rating_avg as "ratingAvg", g.rating_count as "ratingCount", g.pickup_drop_supported as "pickupDropSupported",
              qr.created_at as "requestCreatedAt", qr.issue_summary as "requestIssueSummary", qr.preferred_date as "preferredDate",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear", v.vin as "vehicleVin", v.mileage as "vehicleMileage",
              b.id as "bookingId", b.status as "bookingStatus", b.created_at as "bookingCreatedAt", b.scheduled_at as "bookingScheduledAt",
              u.name as "customerName"
       FROM quotes q
       JOIN garages g ON q.garage_id = g.id
       JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       LEFT JOIN LATERAL (SELECT id, status, created_at, scheduled_at FROM bookings WHERE quote_id = q.id ORDER BY created_at DESC LIMIT 1) b ON true
       LEFT JOIN users u ON qr.customer_id = u.id
       WHERE qr.customer_id = $1
       ORDER BY q.created_at DESC`,
      [customerId]
    );

    const mapped = result.rows.map((row: Record<string, any>) => {
      const details = row.details || {};
      const amountNum = Number(row.amount || row.totalCost || 0);
      const laborCostNum = Number(row.laborCost || 0);
      const partsCostNum = Number(row.partsCost || 0);

      let timeStr = row.etaNote || (row.etaDays ? `${row.etaDays} days` : 'TBD');
      if (timeStr && /^\\d+$/.test(timeStr.trim())) {
        timeStr = `${timeStr.trim()} Days`;
      }

      return {
        id: row.id,
        quoteRequestId: row.quoteRequestId,
        status: row.status || 'open',
        isBooked: !!row.bookingId,
        bookingDetails: row.bookingId ? {
          id: row.bookingId,
          status: row.bookingStatus,
          createdAt: row.bookingCreatedAt,
          scheduledAt: row.bookingScheduledAt,
        } : null,
        garage: row.garageName,
        customerName: row.customerName,
        image: '/assets/garage_1_1778071156220.png',
        rating: String(row.ratingAvg || '4.5'),
        reviews: Number(row.ratingCount || 0),
        distance: '3.0 km away',
        meta: 'Certified technicians',
        metaSecondary: '6 Months warranty',
        price: `$${amountNum.toLocaleString('en-US')}`,
        savings: undefined,
        time: timeStr,
        tag: undefined,
        requestCreatedAt: row.requestCreatedAt,
        requestIssueSummary: row.requestIssueSummary,
        preferredDate: row.preferredDate,
        vehicle: row.vehicleMake ? {
          make: row.vehicleMake,
          model: row.vehicleModel,
          year: row.vehicleYear,
          vin: row.vehicleVin,
          mileage: row.vehicleMileage
        } : null,
        details: {
          parts: partsCostNum,
          labour: laborCostNum,
          remarks: details.remarks,
          pickupDrop: row.pickupDropSupported ? 'Available' : 'Not Available',
        }
      };
    });

    return success(res, mapped);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Database query failed',
      'DATABASE_ERROR',
      500
    );
  }
});

quotesRouter.get('/garage-requests', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized for garage access', 'UNAUTHORIZED', 403);
    }
    
    const garageId = req.user?.garageId;
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    const result = await query(
      `SELECT qr.id, qr.customer_id as "customerId", qr.vehicle_id as "vehicleId", qr.issue_summary as "issueSummary", qr.status, qr.created_at as "createdAt",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear", v.vin as "vehicleVin", v.mileage as "vehicleMileage",
              NULL as "customerAvatar", u.name as "customerName"
       FROM quote_requests qr
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       LEFT JOIN users u ON qr.customer_id = u.id
       WHERE qr.garage_id = $1
       ORDER BY qr.created_at DESC`,
      [garageId]
    );

    const mapped = result.rows.map((row: any) => ({
      id: row.id,
      customerId: row.customerId,
      customerName: row.customerName || 'Customer',
      customerAvatar: row.customerAvatar,
      vehicleId: row.vehicleId,
      issueSummary: row.issueSummary,
      status: row.status,
      createdAt: row.createdAt,
      vehicle: row.vehicleMake ? {
        make: row.vehicleMake,
        model: row.vehicleModel,
        year: row.vehicleYear,
        vin: row.vehicleVin,
        mileage: row.vehicleMileage
      } : null
    }));

    return success(res, mapped);
  } catch (err) {
    return error(res, err instanceof Error ? err.message : 'Failed to fetch garage requests', 'DATABASE_ERROR', 500);
  }
});

quotesRouter.get('/garage/stats', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized for garage access', 'UNAUTHORIZED', 403);
    }

    const garageId = req.user?.garageId;
    if (!garageId) {
      return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);
    }

    // Incoming Requests = Pending bookings (pendingPayment)
    const incomingRes = await query(`SELECT COUNT(*) FROM bookings WHERE garage_id = $1 AND status = 'pendingPayment'`, [garageId]);
    
    // Active Jobs (Bookings) = PendingPayment, Accepted, In Progress, Completed
    const activeJobsRes = await query(`SELECT COUNT(*) FROM bookings WHERE garage_id = $1 AND status IN ('pendingPayment', 'confirmed', 'accepted', 'in_progress', 'completed')`, [garageId]);
    
    // Generated Quotes (Pending Quote Requests) = open
    const generatedQuotesRes = await query(`SELECT COUNT(*) FROM quote_requests WHERE garage_id = $1`, [garageId]);

    
    // Completed Jobs = COMPLETED
    const completedRes = await query(`SELECT COUNT(*) FROM bookings WHERE garage_id = $1 AND status = 'completed'`, [garageId]);

    const stats = {
      incoming: Number(incomingRes.rows[0].count),
      todaysBookings: 0,
      activeJobs: Number(activeJobsRes.rows[0].count),
      generatedQuotes: Number(generatedQuotesRes.rows[0].count),
      completed: Number(completedRes.rows[0].count)
    };

    return success(res, stats);
  } catch (err) {
    return error(res, 'Failed to fetch garage stats', 'DATABASE_ERROR', 500);
  }
});

quotesRouter.post('/garage-requests/:id/accept', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }
    const garageId = req.user?.garageId;
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);
    
    const result = await query(
      `UPDATE quote_requests SET status = 'selected' WHERE id = $1 AND status = 'open' AND garage_id = $2 RETURNING id`,
      [req.params.id, garageId]
    );

    if (result.rows.length === 0) {
      return error(res, 'Request is no longer pending or not found', 'BAD_REQUEST', 400);
    }

    return success(res, { success: true, message: 'Request accepted' });
  } catch (err) {
    return error(res, 'Database error', 'DATABASE_ERROR', 500);
  }
});

quotesRouter.post('/:quoteRequestId/quotes', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }

    const { labourCost, partsCost, estimatedTime, remarks } = req.body;
    
    const garageId = req.user?.garageId;
    if (!garageId) {
      return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);
    }

    const existingQuote = await query(
      `SELECT id FROM quotes WHERE quote_request_id = $1 AND garage_id = $2`,
      [req.params.quoteRequestId, garageId]
    );

    if (existingQuote.rows.length > 0) {
      return error(res, 'Quote already submitted for this request', 'BAD_REQUEST', 400);
    }

    const amount = Number(labourCost || 0) + Number(partsCost || 0);

    const result = await query(
      `INSERT INTO quotes (quote_request_id, garage_id, amount, currency, status, details)
       VALUES ($1, $2, $3, 'USD', 'active', $4)
       RETURNING id`,
      [
        req.params.quoteRequestId, 
        garageId, 
        amount, 
        JSON.stringify({ 
          remarks,
          laborCost: labourCost,
          partsCost: partsCost,
          totalCost: amount,
          etaNote: estimatedTime
        })
      ]
    );

    await query(`UPDATE quote_requests SET status = 'quoted' WHERE id = $1`, [req.params.quoteRequestId]);

    return success(res, { success: true, quoteId: result.rows[0].id }, 201);
  } catch (err) {
    return error(res, 'Database error', 'DATABASE_ERROR', 500);
  }
});

quotesRouter.post('/requests', authenticate, async (req, res) => {
  try {
    const { vehicleId, issueSummary, diagnosisRequestId, preferredDate, garageId } = req.body;
    if (!vehicleId || !issueSummary || !garageId) {
      return error(res, 'Vehicle ID, Garage ID and Issue Summary are required', 'BAD_REQUEST', 400);
    }

    const customerId = req.user?.userId;
    if (!customerId) {
      return error(res, 'Authentication failed: no customer ID found', 'UNAUTHORIZED', 401);
    }

    const vehicleRes = await query(
      'SELECT id FROM vehicles WHERE id = $1',
      [vehicleId]
    );
    if (vehicleRes.rows.length === 0) {
      return error(res, 'Vehicle not found', 'BAD_REQUEST', 400);
    }

    if (garageId === 'ALL') {
      const garagesRes = await query(`SELECT id FROM garages WHERE is_approved = true OR approval_status = 'approved'`);
      if (garagesRes.rows.length === 0) {
        return error(res, 'No approved garages found', 'BAD_REQUEST', 400);
      }
      const createdRequests = [];
      for (const row of garagesRes.rows) {
        const result = await query(
          `INSERT INTO quote_requests (customer_id, vehicle_id, diagnosis_request_id, issue_summary, preferred_date, status, garage_id)
           VALUES ($1, $2, $3, $4, $5, 'open', $6)
           RETURNING id, customer_id as "customerId", vehicle_id as "vehicleId", diagnosis_request_id as "diagnosisRequestId", issue_summary as "issueSummary", preferred_date as "preferredDate", status, created_at as "createdAt"`,
          [customerId, vehicleId, diagnosisRequestId || null, issueSummary, preferredDate || null, row.id]
        );
        createdRequests.push(result.rows[0]);
      }
      return success(res, createdRequests[0], 201);
    } else {
      const result = await query(
        `INSERT INTO quote_requests (customer_id, vehicle_id, diagnosis_request_id, issue_summary, preferred_date, status, garage_id)
         VALUES ($1, $2, $3, $4, $5, 'open', $6)
         RETURNING id, customer_id as "customerId", vehicle_id as "vehicleId", diagnosis_request_id as "diagnosisRequestId", issue_summary as "issueSummary", preferred_date as "preferredDate", status, created_at as "createdAt"`,
        [customerId, vehicleId, diagnosisRequestId || null, issueSummary, preferredDate || null, garageId]
      );
      return success(res, result.rows[0], 201);
    }
  } catch (err: any) {
    console.error('Quote request creation failed:', err);
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to create quote request',
      'DATABASE_ERROR',
      500
    );
  }
});

quotesRouter.get('/requests', authenticate, async (req, res) => {
  try {
    const customerId = req.user?.userId;
    if (!customerId) {
      return error(res, 'Authentication failed: no customer ID found', 'UNAUTHORIZED', 401);
    }

    const result = await query(
      `SELECT DISTINCT ON (qr.created_at) qr.id, qr.customer_id as "customerId", qr.vehicle_id as "vehicleId", qr.issue_summary as "issueSummary", qr.status, qr.created_at as "createdAt",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear", v.vin as "vehicleVin", v.mileage as "vehicleMileage"
       FROM quote_requests qr
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       WHERE qr.customer_id = $1
       ORDER BY qr.created_at DESC`,
      [customerId]
    );

    const mapped = result.rows.map((row: any) => ({
      id: row.id,
      customerId: row.customerId,
      vehicleId: row.vehicleId,
      issueSummary: row.issueSummary,
      status: row.status,
      createdAt: row.createdAt,
      vehicle: row.vehicleMake ? {
        make: row.vehicleMake,
        model: row.vehicleModel,
        year: row.vehicleYear,
        vin: row.vehicleVin,
        mileage: row.vehicleMileage
      } : null
    }));

    return success(res, mapped);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Database query failed',
      'DATABASE_ERROR',
      500
    );
  }
});

quotesRouter.get('/requests/:requestId', authenticate, async (req, res) => {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.requestId)) {
      return error(res, 'Invalid request ID format', 'BAD_REQUEST', 400);
    }

    const result = await query(
      `SELECT qr.id, qr.customer_id as "customerId", qr.vehicle_id as "vehicleId", qr.issue_summary as "issueSummary", qr.status, qr.created_at as "createdAt",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear", v.vin as "vehicleVin", v.mileage as "vehicleMileage"
       FROM quote_requests qr
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       WHERE qr.id = $1`,
      [req.params.requestId]
    );

    if (result.rows.length === 0) {
      return error(res, 'Quote request not found', 'NOT_FOUND', 404);
    }

    const row = result.rows[0];

    // Data isolation check for quote request
    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    if (!userRoles.includes('admin') && !userRoles.includes('garage') && row.customerId !== userId) {
      return error(res, 'Forbidden: You do not have access to this request', 'FORBIDDEN', 403);
    }

    return success(res, {
      id: row.id,
      customerId: row.customerId,
      vehicleId: row.vehicleId,
      issueSummary: row.issueSummary,
      status: row.status,
      createdAt: row.createdAt,
      vehicle: row.vehicleMake ? {
        make: row.vehicleMake,
        model: row.vehicleModel,
        year: row.vehicleYear,
        vin: row.vehicleVin,
        mileage: row.vehicleMileage
      } : null
    });
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Database query failed',
      'DATABASE_ERROR',
      500
    );
  }
});

quotesRouter.get('/:quoteId', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT q.id, q.quote_request_id as "quoteRequestId", q.amount, q.currency, q.eta_days as "etaDays", q.status, q.created_at as "createdAt", q.details, q.garage_id as "quoteGarageId",
              q.details->>'laborCost' as "laborCost", q.details->>'partsCost' as "partsCost", q.details->>'totalCost' as "totalCost", q.details->>'etaNote' as "etaNote",
              g.name as "garageName", g.owner_user_id as "garageOwnerId", g.rating_avg as "ratingAvg", g.rating_count as "ratingCount", g.pickup_drop_supported as "pickupDropSupported",
              qr.customer_id as "requestCustomerId", qr.created_at as "requestCreatedAt", qr.issue_summary as "requestIssueSummary",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear", v.vin as "vehicleVin", v.mileage as "vehicleMileage"
       FROM quotes q
       JOIN garages g ON q.garage_id = g.id
       JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       WHERE q.id = $1`,
      [req.params.quoteId]
    );

    if (result.rows.length === 0) {
      return error(res, 'Quote not found', 'NOT_FOUND', 404);
    }

    const row = result.rows[0];
    
    // Data isolation check for quote
    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    if (!userRoles.includes('admin') && row.requestCustomerId !== userId && row.garageOwnerId !== userId) {
      return error(res, 'Forbidden: You do not have access to this quote', 'FORBIDDEN', 403);
    }

    const details = row.details || {};
    const amountNum = Number(row.amount || row.totalCost || 0);
    const laborCostNum = Number(row.laborCost || 0);
    const partsCostNum = Number(row.partsCost || 0);

    const mapped = {
      id: row.id,
      quoteRequestId: row.quoteRequestId,
      status: row.status || 'open',
      garage: row.garageName,
      image: '/assets/garage_1_1778071156220.png',
      rating: String(row.ratingAvg || '4.5'),
      reviews: Number(row.ratingCount || 0),
      distance: '3.0 km away',
      meta: 'Certified technicians',
      metaSecondary: '6 Months warranty',
      price: `$${amountNum.toLocaleString('en-US')}`,
      savings: undefined,
      time: row.etaNote || (row.etaDays ? `${row.etaDays} days` : 'TBD'),
      tag: undefined,
      requestCreatedAt: row.requestCreatedAt,
      requestIssueSummary: row.requestIssueSummary,
      vehicle: row.vehicleMake ? {
        make: row.vehicleMake,
        model: row.vehicleModel,
        year: row.vehicleYear,
        vin: row.vehicleVin,
        mileage: row.vehicleMileage
      } : null,
      details: {
        parts: partsCostNum,
        labour: laborCostNum,
        remarks: details.remarks,
        pickupDrop: row.pickupDropSupported ? 'Available' : 'Not Available',
      }
    };

    return success(res, mapped);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Database query failed',
      'DATABASE_ERROR',
      500
    );
  }
});

quotesRouter.get('/garage/active-jobs', authenticate, async (req, res) => {
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
      `SELECT b.id as "id", b.quote_id as "quoteRequestId", b.total_amount as "amount", 'active' as "quoteStatus", b.created_at as "quoteCreatedAt", NULL as "details",
              b.booking_type as "issueSummary", NULL as "requestStatus",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear",
              u.name as "customerName", NULL as "customerAvatar",
              b.status as "bookingStatus", b.scheduled_at as "bookingDate", b.booking_type as "serviceType"
       FROM bookings b
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN users u ON b.customer_id = u.id
       WHERE b.garage_id = $1 AND b.status = 'in_progress'
       ORDER BY "quoteCreatedAt" DESC`,
      [garageId]
    );
    const mapped = result.rows.map(row => ({
      ...row,
      amount: Number(row.amount || 0)
    }));
    return success(res, mapped);
  } catch (err) {
    return error(res, 'Failed to fetch active jobs', 'DATABASE_ERROR', 500);
  }
});

quotesRouter.get('/garage/quotes', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }
    const garageId = req.user?.garageId;
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    const result = await query(
      `SELECT q.id, q.quote_request_id as "quoteRequestId", q.amount as "totalCost", q.details->>'laborCost' as "laborCost", q.details->>'partsCost' as "partsCost", q.eta_days as "etaDays", q.details->>'etaNote' as "etaNote", q.status as "quoteStatus", q.created_at as "createdAt", q.details,
              qr.issue_summary as "issueSummary",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear",
              u.name as "customerName", NULL as "customerAvatar"
       FROM quotes q
       JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       LEFT JOIN users u ON qr.customer_id = u.id
       WHERE q.garage_id = $1
       ORDER BY q.created_at DESC`,
      [garageId]
    );
    const mapped = result.rows.map(row => ({
      ...row,
      laborCost: Number(row.laborCost || 0),
      partsCost: Number(row.partsCost || 0),
      totalCost: Number(row.totalCost || 0)
    }));
    return success(res, mapped);
  } catch (err) {
    return error(res, 'Failed to fetch quotes', 'DATABASE_ERROR', 500);
  }
});

quotesRouter.get('/garage/completed-jobs', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }
    const garageId = req.user?.garageId;
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    const result = await query(
      `SELECT b.id, b.status as "bookingStatus", b.created_at as "completionDate",
              COALESCE(b.total_amount, q.amount) as "quoteAmount", q.details,
              COALESCE(qr.issue_summary, b.booking_type) as "issueSummary",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear",
              u.name as "customerName", u.mobile_number as "customerContact", NULL as "customerAvatar"
       FROM bookings b
       LEFT JOIN quotes q ON b.quote_id = q.id
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN users u ON b.customer_id = u.id
       WHERE b.garage_id = $1 AND b.status = 'completed'
       ORDER BY b.updated_at DESC`,
      [garageId]
    );
    const mapped = result.rows.map(row => ({
      ...row,
      quoteAmount: Number(row.quoteAmount || 0)
    }));
    return success(res, mapped);
  } catch (err) {
    return error(res, 'Failed to fetch completed jobs', 'DATABASE_ERROR', 500);
  }
});
