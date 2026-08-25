import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/database';
import { validateOffer, recordOfferRedemption } from '../offers/offers.service';
import { holdWalletBalance } from '../wallet/wallet.service';
import { createRazorpayOrder } from '../payments/razorpay.service';
import { NotificationsService } from '../notifications/notifications.service';

export const bookingsRouter = Router();

// GET /bookings — list all bookings globally
bookingsRouter.get('/', authenticate, async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    const userId = req.user?.userId;
    let filterCondition = '1=1';
    const params: any[] = [];
    
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


async function createBookingInternal(req: any, res: any, data: {
  garageId?: string;
  vehicleId: string;
  scheduledAt: string;
  totalAmount: number;
  bookingType: string;
  quoteId?: string | null;
  currency?: string;
  serviceType?: string;
  offerCode?: string;
  walletAmountToUse?: number;
}) {
  const customerId = req.user?.userId;
  let { garageId } = data;
  const { vehicleId, scheduledAt, totalAmount, bookingType, quoteId, currency, serviceType, offerCode, walletAmountToUse } = data;

  if (!vehicleId || !scheduledAt || totalAmount === undefined || !bookingType) {
    return error(res, 'Missing required booking fields', 'BAD_REQUEST', 400);
  }

  const userCheck = await query('SELECT status FROM users WHERE id = $1', [customerId]);
  if (userCheck.rows.length === 0 || userCheck.rows[0].status === 'suspended') {
    return error(res, 'Your account is suspended. You cannot create new bookings.', 'FORBIDDEN', 403);
  }

  // If quoteId is provided, lookup the garageId from the quote if not provided
  if (quoteId) {
    try {
      const quoteResult = await query('SELECT garage_id, expires_at FROM quotes WHERE id = $1', [quoteId]);
      if (quoteResult.rows.length > 0) {
        const expiresAt = quoteResult.rows[0].expires_at;
        if (expiresAt && new Date(expiresAt) < new Date()) {
          return error(res, 'This quote has expired and can no longer be booked.', 'BAD_REQUEST', 400);
        }
        if (!garageId) {
          garageId = quoteResult.rows[0].garage_id;
        }
      }
    } catch (err) {
      console.error('Failed quote association processing:', err);
    }
  }

  if (!garageId) {
    return error(res, 'Garage ID is required to create a booking', 'BAD_REQUEST', 400);
  }

  try {
    // Check if garage is suspended or deleted
    const garageCheck = await query(`SELECT approval_status FROM garages WHERE id = $1`, [garageId]);
    if (garageCheck.rows.length === 0) {
      return error(res, 'Garage not found', 'NOT_FOUND', 404);
    }
    const garageStatus = garageCheck.rows[0].approval_status;
    if (garageStatus === 'suspended' || garageStatus === 'deleted' || garageStatus === 'inactive') {
      return error(res, 'This garage is not available for new bookings.', 'FORBIDDEN', 403);
    }

    const finalServiceType = serviceType || 'General Service';
    let finalAmount = Number(totalAmount);
    let offerId: string | null = null;
    let discountApplied = 0;

    // 1. Offer Validation
    if (offerCode) {
      const offerValidation = await validateOffer(offerCode, customerId, finalAmount);
      offerId = offerValidation.offerId;
      discountApplied = offerValidation.discount;
      finalAmount -= discountApplied;
    }

    // 2. Wallet Hold (if requested)
    let heldWalletAmount = 0;
    if (walletAmountToUse && walletAmountToUse > 0) {
      // Cannot use more wallet than the final amount
      heldWalletAmount = Math.min(walletAmountToUse, finalAmount);
    }

    // Insert booking in 'pendingPayment' (or 'confirmed' if completely paid)
    const status = finalAmount - heldWalletAmount <= 0 ? 'confirmed' : 'pendingPayment';
    const paymentStatus = finalAmount - heldWalletAmount <= 0 ? 'paid' : 'pending';

    const result = await query(
      `INSERT INTO bookings (customer_id, garage_id, vehicle_id, quote_id, booking_type, scheduled_at, status, payment_status, total_amount, currency, customer_note, offer_id, discount_applied, wallet_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, customer_id as "customerId", garage_id as "garageId", vehicle_id as "vehicleId", quote_id as "quoteId", booking_type as "bookingType", scheduled_at as "scheduledAt", status, payment_status as "paymentStatus", total_amount as "totalAmount", currency, created_at as "createdAt"`,
      [
        customerId,
        garageId,
        vehicleId,
        quoteId || null,
        bookingType,
        scheduledAt,
        status,
        paymentStatus,
        totalAmount, 
        currency || 'INR',
        finalServiceType,
        offerId,
        discountApplied,
        heldWalletAmount
      ]
    );

    const booking = result.rows[0];
    const bookingId = booking.id;

    // 1b. Update quote status to 'selected' now that booking is successfully inserted
    if (quoteId) {
      await query("UPDATE quotes SET status = 'selected' WHERE id = $1", [quoteId]);
    }

    // Record offer redemption
    if (offerId && discountApplied > 0) {
      await recordOfferRedemption(offerId, customerId, bookingId, discountApplied);
    }

    // Hold Wallet Funds atomically
    if (heldWalletAmount > 0) {
      await holdWalletBalance(customerId, heldWalletAmount, 'BOOKING', bookingId);
      // We will commit this hold on webhook success, or release it on failure
    }

    const remainingAmountToPay = finalAmount - heldWalletAmount;

    // 3. Create Razorpay Order if remaining balance is > 0
    let razorpayOrder = null;
    if (remainingAmountToPay > 0) {
      const amountInPaise = Math.round(remainingAmountToPay * 100);
      razorpayOrder = await createRazorpayOrder(amountInPaise, `rcpt_${bookingId}`, {
        bookingId,
        customerId
      });
      
      // Save provider intent internally
      await query(
        `UPDATE bookings SET payment_intent_id = $1 WHERE id = $2`,
        [razorpayOrder.id, bookingId]
      );
    }

    // Fetch customer name and garage name for notification
    const customerRes = await query('SELECT name FROM users WHERE id = $1', [customerId]);
    const garageRes = await query('SELECT name FROM garages WHERE id = $1', [garageId]);
    const customerName = customerRes.rows[0]?.name || 'A customer';
    const garageName = garageRes.rows[0]?.name || 'a garage';

    await NotificationsService.createNotification({
      garageId: garageId,
      type: 'Booking',
      title: 'New Booking',
      description: `${customerName} booked your garage.`
    }).catch(err => console.error('Failed to create notification', err));

    await NotificationsService.createNotification({
      isAdmin: true,
      type: 'Booking',
      title: 'New Booking',
      description: `${customerName} booked ${garageName}.`
    }).catch(err => console.error('Failed to create notification', err));

    return success(
      res,
      {
        ...booking,
        totalAmount: Number(booking.totalAmount),
        finalAmountToPay: remainingAmountToPay,
        razorpayOrderId: razorpayOrder?.id || null,
        status: booking.status
      },
      201
    );
  } catch (err) {
    console.error('Booking creation error:', err);
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
              b.scheduled_at as "scheduledAt", b.status, b.total_amount as "totalAmount", b.currency as "currency", b.created_at as "createdAt",
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear", v.vin as "vin",
              u.name as "customerName", u.mobile_number as "customerPhone", p.avatar_url as "customerAvatar",
              q.details as "quoteDetails", q.amount as "quoteAmount", q.eta_days as "estimatedDays",
              qr.issue_summary as "issueDescription"
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
    const { vehicleId, vehicle, issueDescription, scheduledAt, totalAmount, currency, serviceType } = req.body;
    
    // Auto-fetch missing data from quote and quote_request
    const quoteResult = await query(
      `SELECT q.garage_id, q.total_cost, qr.vehicle_id, q.currency, q.expires_at
       FROM quotes q 
       JOIN quote_requests qr ON q.quote_request_id = qr.id
       WHERE q.id = $1`, 
      [quoteId]
    );

    if (quoteResult.rows.length === 0) {
      return error(res, 'Quote not found', 'NOT_FOUND', 404);
    }
    
    const quoteData = quoteResult.rows[0];
    
    if (quoteData.expires_at && new Date(quoteData.expires_at) < new Date()) {
      return error(res, 'This quote has expired and can no longer be booked.', 'BAD_REQUEST', 400);
    }
    
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
  } catch (err: any) {
    console.error('Error processing quote booking:', err);
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to process quote',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

// GET /bookings/:bookingId — retrieve detailed booking by ID
bookingsRouter.get('/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const userRoles = req.user?.roles || [];
    const userId = req.user?.userId;
    let filterCondition = '1=1';
    const params: any[] = [bookingId];
    
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
    const { status, collectionTime } = req.body;

    const allowedStatuses = ['pendingPayment', 'pending', 'confirmed', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected', 'readyForCollection', 'collected'];
    if (!status || !allowedStatuses.includes(status)) {
      return error(res, `Invalid or missing status. Allowed values: ${allowedStatuses.join(', ')}`, 'BAD_REQUEST', 400);
    }

    const userRoles = req.user?.roles || [];
    let garageCheck = '';
    const params: any[] = [bookingId];

    if (!userRoles.includes('admin')) {
      if (userRoles.includes('garage')) {
        const garageId = req.user?.garageId;
        if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);

        const gCheckResult = await query(`SELECT approval_status FROM garages WHERE id = $1`, [garageId]);
        const gStatus = gCheckResult.rows[0]?.approval_status;
        if (gStatus === 'suspended' || gStatus === 'deleted' || gStatus === 'inactive') {
          return error(res, 'Your garage account is suspended or inactive.', 'FORBIDDEN', 403);
        }

        garageCheck = ' AND garage_id = $2';
        params.push(garageId);
      } else {
        // Customer check: Customers can only cancel or mark as collected
        if (status !== 'cancelled' && status !== 'collected') {
          return error(res, 'Customers can only cancel bookings or mark them as collected', 'FORBIDDEN', 403);
        }
        garageCheck = ' AND customer_id = $2';
        params.push(req.user?.userId);
      }
    }

    let dbStatus = status;
    if (status === 'pending') dbStatus = 'pendingPayment';
    if (status === 'accepted') dbStatus = 'confirmed';
    if (status === 'rejected') dbStatus = 'cancelled';
    if (status === 'in_progress') dbStatus = 'inService';

    let updateQuery = `UPDATE bookings SET status = $${params.length + 1}, updated_at = NOW()`;
    const updateParams = [...params, dbStatus];

    if (dbStatus === 'readyForCollection' && collectionTime) {
      updateQuery += `, collection_time = $${updateParams.length + 1}`;
      updateParams.push(collectionTime);
    }

    updateQuery += ` WHERE id = $1${garageCheck} RETURNING id, status, updated_at as "updatedAt"`;

    const result = await query(updateQuery, updateParams);

    if (result.rows.length === 0) {
      return error(res, 'Booking not found', 'NOT_FOUND', 404);
    }

    if (dbStatus === 'inService' || dbStatus === 'completed' || dbStatus === 'readyForCollection' || dbStatus === 'collected') {
      // Fetch details for comprehensive notification
      const bookingRes = await query(
        `SELECT b.customer_note as service_type, u.name as customer_name, u.id as customer_id, g.name as garage_name
         FROM bookings b
         JOIN users u ON b.customer_id = u.id
         JOIN garages g ON b.garage_id = g.id
         WHERE b.id = $1`,
         [bookingId]
      );
      const bData = bookingRes.rows[0];
      const serviceStr = bData?.service_type || 'A service';
      const customerStr = bData?.customer_name || 'a customer';
      const garageStr = bData?.garage_name || 'a garage';
      const custId = bData?.customer_id;

      if (dbStatus === 'inService') {
        await NotificationsService.createNotification({
          userId: custId,
          type: 'Booking',
          title: 'Service In Progress',
          description: 'Your vehicle is currently being serviced.'
        }).catch(err => console.error('Failed to create notification', err));
      } else if (dbStatus === 'completed') {
        await NotificationsService.createNotification({
          userId: custId,
          type: 'Booking',
          title: 'Service Completed',
          description: 'Your vehicle service is completed.'
        }).catch(err => console.error('Failed to create notification', err));
        await NotificationsService.createNotification({
          isAdmin: true,
          type: 'Booking',
          title: 'Service Completed',
          description: `${serviceStr} has been completed by ${garageStr} for ${customerStr}.`
        }).catch(err => console.error('Failed to create notification', err));
      } else if (dbStatus === 'readyForCollection') {
        const timeStr = collectionTime ? ` at ${new Date(collectionTime).toLocaleString()}` : '';
        await NotificationsService.createNotification({
          userId: custId,
          type: 'Booking',
          title: 'Vehicle Ready for Collection',
          description: `Your vehicle is ready. Please collect it${timeStr}.`
        }).catch(err => console.error('Failed to create notification', err));
        await NotificationsService.createNotification({
          isAdmin: true,
          type: 'Booking',
          title: 'Vehicle Ready',
          description: `${garageStr} marked vehicle ready for ${customerStr}.`
        }).catch(err => console.error('Failed to create notification', err));
      } else if (dbStatus === 'collected') {
        await NotificationsService.createNotification({
          garageId: req.user?.garageId || undefined,
          type: 'Booking',
          title: 'Vehicle Collected',
          description: `${customerStr} has confirmed collection of their vehicle.`
        }).catch(err => console.error('Failed to create notification', err));
        await NotificationsService.createNotification({
          isAdmin: true,
          type: 'Booking',
          title: 'Vehicle Collected',
          description: `${customerStr} collected their vehicle from ${garageStr}.`
        }).catch(err => console.error('Failed to create notification', err));
      }
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
