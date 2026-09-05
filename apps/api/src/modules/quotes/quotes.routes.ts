import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/database';
import { NotificationsService } from '../notifications/notifications.service';
import { QuoteEstimationService } from './quote-estimation.service';

export const quotesRouter = Router();

// Helper: resolve garageId from token or DB (handles stale tokens without garageId)
async function resolveGarageId(userId: string, tokenGarageId?: string): Promise<string | null> {
  if (tokenGarageId) return tokenGarageId;
  const result = await query(
    'SELECT id FROM garages WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// POST /quotes/:quoteId/view - Mark a quote as viewed
quotesRouter.post('/:quoteId/view', authenticate, async (req, res) => {
  try {
    const { quoteId } = req.params;
    const userId = req.user?.userId;

    // Verify ownership
    const checkRes = await query(
      `SELECT q.id FROM quotes q
       JOIN quote_requests qr ON q.quote_request_id = qr.id
       WHERE q.id = $1 AND qr.customer_id = $2`,
      [quoteId, userId]
    );

    if (checkRes.rows.length === 0) {
      return error(res, 'Quote not found or unauthorized', 'NOT_FOUND', 404);
    }

    await query(
      `UPDATE quotes SET viewed_at = NOW() WHERE id = $1 AND viewed_at IS NULL`,
      [quoteId]
    );

    return success(res, { message: 'Quote marked as viewed' });
  } catch (err: any) {
    return error(res, err.message || 'Failed to mark quote as viewed', 'INTERNAL_SERVER_ERROR', 500);
  }
});

quotesRouter.get('/', authenticate, async (req, res) => {
  try {
    const customerId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    
    let filterCondition = '1=1';
    const params: any[] = [];
    
    if (!userRoles.includes('admin')) {
      if (!customerId) {
        return error(res, 'Authentication failed: no customer ID found', 'UNAUTHORIZED', 401);
      }
      filterCondition = 'qr.customer_id = $1';
      params.push(customerId);
    }

    const result = await query(
      `SELECT q.id, q.quote_request_id, q.quote_request_id as "quoteRequestId", q.amount, q.currency, q.eta_days as "etaDays", q.status, q.created_at as "createdAt", q.expires_at as "expiresAt", q.viewed_at as "viewedAt", q.details,
              q.details->>'laborCost' as "laborCost", q.details->>'partsCost' as "partsCost", q.details->>'totalCost' as "totalCost", q.details->>'etaNote' as "etaNote",
              g.id as "garageId", g.name as "garageName", g.rating_avg as "ratingAvg", g.rating_count as "ratingCount", g.pickup_drop_supported as "pickupDropSupported",
              g.address as "garageAddress", g.image as "garageImage", g.created_at as "garageCreatedAt", g.established_year as "garageEstablishedYear",
              qr.created_at as "requestCreatedAt", qr.issue_summary as "requestIssueSummary", qr.preferred_date as "preferredDate",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear", v.vin as "vehicleVin", v.mileage as "vehicleMileage", v.fuel_type as "vehicleFuelType",
              b.id as "bookingId", b.status as "bookingStatus", b.created_at as "bookingCreatedAt", b.scheduled_at as "bookingScheduledAt",
              u.name as "customerName", u.mobile_number as "customerPhone", u.email as "customerEmail",
              g.city as "garageCity", p.city as "customerCity"
       FROM quotes q
       JOIN garages g ON q.garage_id = g.id
       JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       LEFT JOIN LATERAL (SELECT id, status, created_at, scheduled_at FROM bookings WHERE quote_id = q.id ORDER BY created_at DESC LIMIT 1) b ON true
       LEFT JOIN users u ON qr.customer_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE ${filterCondition}
       ORDER BY q.created_at DESC`,
      params
    );

    const mapped = result.rows.map((row: Record<string, any>) => {
      let details = row.details || {};
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch(e) {}
      }
      const amountNum = Number(row.amount || row.totalCost || 0);
      const laborCostNum = Number(row.laborCost || 0);
      const partsCostNum = Number(row.partsCost || 0);

      let timeStr = row.etaNote || (row.etaDays ? `${row.etaDays} days` : 'TBD');
      if (timeStr && /^\d+$/.test(timeStr.trim())) {
        timeStr = `${timeStr.trim()} Days`;
      }

      // Determine currency safely — never use user phone/ID as currency
      const rawCurrency = row.currency;
      const validCurrencies = ['INR', 'USD', 'AED', 'GBP', 'EUR', 'SGD', 'AUD', 'CAD'];
      const safeCurrency = (rawCurrency && validCurrencies.includes(rawCurrency)) ? rawCurrency : 'INR';

      return {
        id: row.id,
        quoteRequestId: row.quoteRequestId || row.quote_request_id,
        garageId: row.garageId,
        status: row.status || 'open',
        isBooked: !!row.bookingId,
        bookingDetails: row.bookingId ? {
          id: row.bookingId,
          status: row.bookingStatus,
          createdAt: row.bookingCreatedAt,
          scheduledAt: row.bookingScheduledAt,
        } : null,
        garage: row.garageName,
        garageAddress: row.garageAddress || null,
        garageImage: row.garageImage || null,
        garageCreatedAt: row.garageCreatedAt,
        garageEstablishedYear: row.garageEstablishedYear,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        customerEmail: row.customerEmail,
        customerCity: row.customerCity,
        garageCity: row.garageCity,
        image: row.garageImage || '/assets/garage_1_1778071156220.png',
        rating: String(Number(row.ratingAvg || 0).toFixed(1)),
        reviews: Number(row.ratingCount || 0),
        distance: '3.0 km away',
        meta: row.pickupDropSupported ? 'Pickup & drop • Certified technicians' : 'Certified technicians',
        metaSecondary: details.warranty || '6 Months warranty',
        price: `${amountNum}`,
        currency: safeCurrency,
        savings: undefined,
        time: timeStr,
        tag: undefined,
        expiresAt: row.expiresAt,
        viewedAt: row.viewedAt,
        requestCreatedAt: row.requestCreatedAt,
        requestIssueSummary: row.requestIssueSummary,
        preferredDate: row.preferredDate,
        vehicle: row.vehicleMake ? {
          make: row.vehicleMake,
          model: row.vehicleModel,
          year: row.vehicleYear,
          vin: row.vehicleVin,
          mileage: row.vehicleMileage,
          fuelType: row.vehicleFuelType,
        } : null,
        details: {
          parts: partsCostNum,
          labour: laborCostNum,
          consumables: Number(details.consumablesCost || 0),
          gst: Number(details.gstCost || 0),
          other: Number(details.otherCost || details.otherCharges || 0),
          total: amountNum,
          remarks: details.remarks,
          pickupDrop: details.pickupDrop || (row.pickupDropSupported ? 'Available' : 'Not Available'),
          availability: details.availability,
          warranty: details.warranty,
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
    
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    const result = await query(
      `SELECT qr.id, qr.customer_id as "customerId", qr.vehicle_id as "vehicleId", qr.issue_summary as "issueSummary", qr.status, qr.created_at as "createdAt",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear", v.vin as "vehicleVin", v.mileage as "vehicleMileage",
              NULL as "customerAvatar", u.name as "customerName", u.mobile_number as "customerPhone", u.email as "customerEmail",
              g.name as "garageName"
       FROM quote_requests qr
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       LEFT JOIN users u ON qr.customer_id = u.id
       LEFT JOIN garages g ON qr.garage_id = g.id
       WHERE qr.garage_id = $1
       ORDER BY qr.created_at DESC`,
      [garageId]
    );

    const mapped = result.rows.map((row: any) => ({
      id: row.id,
      customerId: row.customerId,
      customerName: row.customerName || 'Customer',
      customerPhone: row.customerPhone || 'N/A',
      customerEmail: row.customerEmail || 'N/A',
      garageName: row.garageName || 'N/A',
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

    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) {
      return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);
    }

    // Incoming Requests = Pending/Confirmed bookings (matches /garage-incoming)
    const incomingRes = await query(`SELECT COUNT(*) FROM bookings WHERE garage_id = $1 AND status IN ('requested', 'confirmed')`, [garageId]);
    
    // Active Jobs (Bookings) = All non-terminal bookings
    const activeJobsRes = await query(`SELECT COUNT(*) FROM bookings WHERE garage_id = $1 AND status NOT IN ('completed', 'cancelled', 'collected')`, [garageId]);
    
    // Generated Quotes = Unique quotes submitted by this garage (ignoring duplicate quote-request records)
    const generatedQuotesRes = await query(`SELECT COUNT(DISTINCT quote_request_id) FROM quotes WHERE garage_id = $1`, [garageId]);

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
    
    // Check if garage is suspended or deleted
    const garageCheck = await query(`SELECT approval_status FROM garages WHERE id = $1`, [garageId]);
    if (garageCheck.rows[0]?.approval_status === 'suspended' || garageCheck.rows[0]?.approval_status === 'deleted' || garageCheck.rows[0]?.approval_status === 'inactive') {
      return error(res, 'Your garage account is suspended or inactive. You cannot accept requests.', 'FORBIDDEN', 403);
    }
    
    const result = await query(
      `UPDATE quote_requests SET status = 'selected' WHERE id = $1 AND status = 'open' AND garage_id = $2 RETURNING id`,
      [req.params.id, garageId]
    );

    if (result.rows.length === 0) {
      return error(res, 'Request is no longer pending or not found', 'BAD_REQUEST', 400);
    }

    return success(res, { success: true, message: 'Request accepted' });
  } catch (err) {
    return error(res, 'Internal server error', 'INTERNAL_SERVER_ERROR', 500);
  }
});

quotesRouter.post('/requests/:id/estimate', authenticate, async (req, res) => {
  try {
    const customerId = req.user?.userId;
    if (!customerId) return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);
    
    const { id } = req.params;
    // city is passed from the frontend (wrectifai_city cookie value)
    // so the AI generates the estimate in the correct local currency natively
    const { city } = req.body as { city?: string };

    // 1. Get request details
    const reqDetails = await query(`SELECT vehicle_id, issue_summary, ai_estimate FROM quote_requests WHERE id = $1`, [id]);
    if (reqDetails.rows.length === 0) {
      return error(res, 'Quote request not found', 'NOT_FOUND', 404);
    }

    // 2. Check if this exact request already has a cached estimate in the CORRECT currency.
    //    If city is known, invalidate estimates stored with a different currency (stale USD cache).
    const cached = reqDetails.rows[0].ai_estimate;
    if (cached) {
      const cachedCurrency: string | undefined = cached.currency;
      const cityOk = !city || !cachedCurrency || cachedCurrency === getExpectedCurrency(city);
      if (cityOk) {
        return success(res, cached);
      }
      // Stale currency — fall through to regenerate
    }

    const { vehicle_id, issue_summary } = reqDetails.rows[0];

    // 3. Check if ANY related request has a valid estimate in the correct currency
    const existing = await query(`
      SELECT ai_estimate 
      FROM quote_requests 
      WHERE customer_id = $1 AND vehicle_id = $2 AND issue_summary = $3 AND ai_estimate IS NOT NULL
      LIMIT 1
    `, [customerId, vehicle_id, issue_summary]);

    if (existing.rows.length > 0 && existing.rows[0].ai_estimate) {
      const existingEst = existing.rows[0].ai_estimate;
      const existingCurrency: string | undefined = existingEst.currency;
      const cityOk = !city || !existingCurrency || existingCurrency === getExpectedCurrency(city);
      if (cityOk) {
        // Sync it to the current request
        await query(`UPDATE quote_requests SET ai_estimate = $1 WHERE id = $2`, [JSON.stringify(existingEst), id]);
        return success(res, existingEst);
      }
      // Stale currency — fall through to regenerate
    }
    
    // 4. Generate new estimate, passing city so AI uses correct local currency
    const estimate = await QuoteEstimationService.generateLocalEstimate(id, city);
    
    // 5. Save to ALL related requests to prevent inconsistencies
    await query(`
      UPDATE quote_requests 
      SET ai_estimate = $1 
      WHERE customer_id = $2 AND vehicle_id = $3 AND issue_summary = $4
    `, [JSON.stringify(estimate), customerId, vehicle_id, issue_summary]);

    return success(res, estimate);
  } catch (err: any) {
    console.error('Estimate generation error:', err);
    return error(res, err.message || 'Failed to generate estimate', 'INTERNAL_SERVER_ERROR', 500);
  }
});

/** Returns the expected ISO currency code for a known city, or undefined if unknown. */
function getExpectedCurrency(city: string): string | undefined {
  const indiaCities = ['Bengaluru','Mumbai','Delhi','Hyderabad','Chennai','Kolkata','Pune','Kochi','Ahmedabad','Jaipur','Surat','Lucknow','Kanpur','Nagpur','Patna'];
  const uaeCities = ['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain','Al Ain'];
  const usCities = ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','Austin','San Jose','Fort Worth','Jacksonville','Columbus','Charlotte'];
  if (indiaCities.includes(city)) return 'INR';
  if (uaeCities.includes(city)) return 'AED';
  if (usCities.includes(city)) return 'USD';
  return undefined;
}


quotesRouter.post('/:quoteRequestId/quotes', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }

    const { 
      labourCost, partsCost, consumablesCost, gstCost, otherCost, 
      estimatedTime, remarks, availability, pickupDrop, warranty, validityDays 
    } = req.body;
    
    const garageId = req.user?.garageId;
    if (!garageId) {
      return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);
    }

    // Check if garage is suspended or deleted
    const garageCheck = await query(`SELECT approval_status FROM garages WHERE id = $1`, [garageId]);
    if (garageCheck.rows[0]?.approval_status === 'suspended' || garageCheck.rows[0]?.approval_status === 'deleted' || garageCheck.rows[0]?.approval_status === 'inactive') {
      return error(res, 'Your garage account is suspended or inactive. You cannot submit quotes.', 'FORBIDDEN', 403);
    }

    const existingQuote = await query(
      `SELECT id FROM quotes WHERE quote_request_id = $1 AND garage_id = $2`,
      [req.params.quoteRequestId, garageId]
    );

    if (existingQuote.rows.length > 0) {
      return error(res, 'Quote already submitted for this request', 'BAD_REQUEST', 400);
    }

    const amount = Number(labourCost || 0) + Number(partsCost || 0) + Number(consumablesCost || 0) + Number(gstCost || 0) + Number(otherCost || 0);

    const currencyRequestRes = await query('SELECT customer_id FROM quote_requests WHERE id = $1', [req.params.quoteRequestId]);
    const quoteCustomerId = currencyRequestRes.rows[0]?.customer_id;
    let quoteCurrency = 'INR';
    if (quoteCustomerId) {
      const userRes = await query('SELECT currency, location FROM users WHERE id = $1', [quoteCustomerId]);
      if (userRes.rows[0]?.currency) {
        quoteCurrency = userRes.rows[0].currency;
      } else if (userRes.rows[0]?.location && typeof userRes.rows[0].location === 'string') {
        const loc = userRes.rows[0].location.toLowerCase();
        if (loc.includes('us') || loc.includes('united states')) quoteCurrency = 'USD';
        else if (loc.includes('uae') || loc.includes('dubai') || loc.includes('emirates')) quoteCurrency = 'AED';
      }
    }

    const result = await query(
      `INSERT INTO quotes (quote_request_id, garage_id, amount, currency, status, details, parts_cost, labor_cost, total_cost, eta_note, eta_days, comparison_label, expires_at)
       VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9, $10, $11, NOW() + ($12 * INTERVAL '1 day'))
       RETURNING id`,
      [
        req.params.quoteRequestId, 
        garageId, 
        amount,
        quoteCurrency,
        JSON.stringify({ 
          remarks,
          laborCost: labourCost,
          partsCost: partsCost,
          consumablesCost: consumablesCost,
          gstCost: gstCost,
          otherCost: otherCost,
          totalCost: amount,
          etaNote: estimatedTime,
          availability: availability,
          pickupDrop: pickupDrop,
          warranty: warranty
        }),
        Number(partsCost || 0),
        Number(labourCost || 0),
        amount,
        estimatedTime,
        parseInt(estimatedTime) || null,
        'Standard Quote',
        Number(validityDays || 1)
      ]
    );

    await query(`UPDATE quote_requests SET status = 'quoted' WHERE id = $1`, [req.params.quoteRequestId]);

    // Fetch customerId and garageName for notification
    const requestRes = await query('SELECT customer_id FROM quote_requests WHERE id = $1', [req.params.quoteRequestId]);
    const garageRes = await query('SELECT name FROM garages WHERE id = $1', [garageId]);
    const customerId = requestRes.rows[0]?.customer_id;
    const garageName = garageRes.rows[0]?.name || 'A garage';

    if (customerId) {
      await NotificationsService.createNotification({
        userId: customerId,
        type: 'Quote',
        title: 'New Quote Received',
        description: `${garageName} sent you a quote.`
      }).catch(err => console.error('Failed to create notification', err));
    }
    
    // Notify admin
    await NotificationsService.createNotification({
      isAdmin: true,
      type: 'Quote',
      title: 'New Quote Submitted',
      description: `${garageName} submitted a quote.`
    }).catch(err => console.error('Failed to create admin notification', err));

    return success(res, { success: true, quoteId: result.rows[0].id }, 201);
  } catch (err: any) {
    console.error('Error creating quote:', err);
    return error(res, err.message || 'Database error', 'DATABASE_ERROR', 500);
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

    const userCheck = await query('SELECT status FROM users WHERE id = $1', [customerId]);
    if (userCheck.rows.length === 0) {
      return error(res, 'User account not found or invalid session. Please log in again.', 'UNAUTHORIZED', 401);
    }
    if (userCheck.rows[0].status === 'suspended') {
      return error(res, 'Your account is suspended. You cannot create new quote requests.', 'FORBIDDEN', 403);
    }

    const vehicleRes = await query(
      'SELECT id, make, model, year FROM vehicles WHERE id = $1',
      [vehicleId]
    );
    if (vehicleRes.rows.length === 0) {
      return error(res, 'Vehicle not found', 'BAD_REQUEST', 400);
    }
    const vehicle = vehicleRes.rows[0];
    const vehicleStr = vehicle.make ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : issueSummary;
    const customerName = req.user?.name || 'A customer';

    let validDiagnosisRequestId = null;
    if (diagnosisRequestId) {
      const diagCheck = await query('SELECT id FROM diagnosis_requests WHERE id = $1', [diagnosisRequestId]);
      if (diagCheck.rows.length > 0) {
        validDiagnosisRequestId = diagnosisRequestId;
      }
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
          [customerId, vehicleId, validDiagnosisRequestId, issueSummary, preferredDate || null, row.id]
        );
        createdRequests.push(result.rows[0]);
        
        await NotificationsService.createNotification({
          garageId: row.id,
          type: 'Quote',
          title: 'New Quote Request',
          description: `${customerName} requested a quote for ${vehicleStr}.`
        }).catch(err => console.error('Failed to create notification', err));
      }
      return success(res, createdRequests[0], 201);
    } else {
      // Check if specific garage is suspended or deleted
      const garageCheck = await query(`SELECT approval_status FROM garages WHERE id = $1`, [garageId]);
      if (garageCheck.rows.length === 0) {
        return error(res, 'Garage not found', 'NOT_FOUND', 404);
      }
      const status = garageCheck.rows[0].approval_status;
      if (status === 'suspended' || status === 'deleted' || status === 'inactive') {
        return error(res, 'This garage is not available for new requests.', 'FORBIDDEN', 403);
      }

      const result = await query(
        `INSERT INTO quote_requests (customer_id, vehicle_id, diagnosis_request_id, issue_summary, preferred_date, status, garage_id)
         VALUES ($1, $2, $3, $4, $5, 'open', $6)
         RETURNING id, customer_id as "customerId", vehicle_id as "vehicleId", diagnosis_request_id as "diagnosisRequestId", issue_summary as "issueSummary", preferred_date as "preferredDate", status, created_at as "createdAt"`,
        [customerId, vehicleId, validDiagnosisRequestId, issueSummary, preferredDate || null, garageId]
      );
      
      await NotificationsService.createNotification({
        garageId: garageId,
        type: 'Quote',
        title: 'New Quote Request',
        description: `${customerName} requested a quote for ${vehicleStr}.`
      }).catch(err => console.error('Failed to create notification', err));

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


quotesRouter.get('/garage/active-jobs', authenticate, async (req, res) => {
  try {
    const garageUserId = req.user?.userId;
    if (!garageUserId || !req.user?.roles?.includes('garage')) {
      return error(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) {
      return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);
    }

    const result = await query(
      `SELECT b.id as "id", b.quote_id as "quoteRequestId", b.total_amount as "amount", b.currency as "currency", 'active' as "quoteStatus", b.created_at as "quoteCreatedAt", NULL as "details",
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
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    const result = await query(
      `SELECT q.id, q.quote_request_id as "quoteRequestId", q.amount as "totalCost", q.currency as "currency", q.details->>'laborCost' as "laborCost", q.details->>'partsCost' as "partsCost", q.eta_days as "etaDays", q.details->>'etaNote' as "etaNote", q.status as "quoteStatus", q.created_at as "createdAt", q.details,
              qr.issue_summary as "issueSummary",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear",
              u.name as "customerName", u.mobile_number as "customerPhone", u.email as "customerEmail", NULL as "customerAvatar",
              g.name as "garageName"
       FROM quotes q
       JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN vehicles v ON qr.vehicle_id = v.id
       LEFT JOIN users u ON qr.customer_id = u.id
       LEFT JOIN garages g ON q.garage_id = g.id
       WHERE q.garage_id = $1
       ORDER BY q.created_at DESC`,
      [garageId]
    );
    const mapped = result.rows.map(row => {
      let parsedDetails = row.details || {};
      if (typeof parsedDetails === 'string') {
        try { parsedDetails = JSON.parse(parsedDetails); } catch(e) {}
      }
      return {
        ...row,
        details: parsedDetails,
        customerPhone: row.customerPhone || 'N/A',
        customerEmail: row.customerEmail || 'N/A',
        garageName: row.garageName || 'N/A',
        laborCost: Number(row.laborCost || 0),
        partsCost: Number(row.partsCost || 0),
        totalCost: Number(row.totalCost || 0)
      };
    });
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
    const garageId = await resolveGarageId(req.user!.userId, req.user?.garageId);
    if (!garageId) return error(res, 'Garage not found for this user', 'BAD_REQUEST', 400);

    const result = await query(
      `SELECT b.id, b.status as "bookingStatus", b.created_at as "completionDate", b.currency as "currency",
              COALESCE(b.total_amount, q.amount) as "quoteAmount", q.details,
              COALESCE(qr.issue_summary, b.booking_type) as "issueSummary",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear",
              u.name as "customerName", u.mobile_number as "customerContact", NULL as "customerAvatar"
       FROM bookings b
       LEFT JOIN quotes q ON b.quote_id = q.id
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN users u ON b.customer_id = u.id
       WHERE b.garage_id = $1 AND b.status IN ('completed', 'readyForCollection', 'collected')
       ORDER BY b.updated_at DESC`,
      [garageId]
    );
    const mapped = result.rows.map(row => {
      let parsedDetails = row.details || {};
      if (typeof parsedDetails === 'string') {
        try { parsedDetails = JSON.parse(parsedDetails); } catch(e) {}
      }
      return {
        ...row,
        details: parsedDetails,
        quoteAmount: Number(row.quoteAmount || 0)
      };
    });
    return success(res, mapped);
  } catch (err) {
    return error(res, 'Failed to fetch completed jobs', 'DATABASE_ERROR', 500);
  }
});

quotesRouter.get('/:quoteId', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT q.id, q.quote_request_id, q.quote_request_id as "quoteRequestId", q.amount, q.currency, q.eta_days as "etaDays", q.status, q.created_at as "createdAt", q.details, q.garage_id as "quoteGarageId",
              q.details->>'laborCost' as "laborCost", q.details->>'partsCost' as "partsCost", q.details->>'totalCost' as "totalCost", q.details->>'etaNote' as "etaNote",
              g.name as "garageName", g.owner_user_id as "garageOwnerId", g.rating_avg as "ratingAvg", g.rating_count as "ratingCount", g.pickup_drop_supported as "pickupDropSupported", g.created_at as "garageCreatedAt",
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

    let details = row.details || {};
    if (typeof details === 'string') {
      try { details = JSON.parse(details); } catch(e) {}
    }
    const amountNum = Number(row.amount || row.totalCost || 0);
    const laborCostNum = Number(row.laborCost || 0);
    const partsCostNum = Number(row.partsCost || 0);

    const mapped = {
      id: row.id,
      quoteRequestId: row.quoteRequestId || row.quote_request_id,
      status: row.status || 'open',
      garage: row.garageName,
      garageCreatedAt: row.garageCreatedAt,
      image: '/assets/garage_1_1778071156220.png',
      rating: String(Number(row.ratingAvg || 0).toFixed(1)),
      reviews: Number(row.ratingCount || 0),
      distance: '3.0 km away',
      meta: row.pickupDropSupported ? 'Pickup & drop • Certified technicians' : 'Certified technicians',
      metaSecondary: details.warranty || '6 Months warranty',
      price: `${amountNum}`,
      currency: row.currency || 'INR',
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
        consumables: Number(details.consumablesCost || 0),
        gst: Number(details.gstCost || 0),
        other: Number(details.otherCost || details.otherCharges || 0),
        total: amountNum,
        remarks: details.remarks,
        pickupDrop: details.pickupDrop || (row.pickupDropSupported ? 'Available' : 'Not Available'),
        availability: details.availability,
        warranty: details.warranty,
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

