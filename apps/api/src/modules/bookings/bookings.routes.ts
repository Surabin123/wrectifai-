import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/database';
import { validateOffer, recordOfferRedemption, processCashback } from '../offers/offers.service';
import { holdWalletBalance } from '../wallet/wallet.service';
import { createRazorpayOrder } from '../payments/razorpay.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralService } from '../../services/referral.service';

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
        b.payment_status as "paymentStatus",
        (SELECT p.status FROM payments p WHERE p.booking_id = b.id AND p.method = 'cash' ORDER BY p.created_at DESC LIMIT 1) as "cashPaymentStatus",
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
        u.email as "customerEmail",
        p.city as "customerCity",
        g.city as "garageCity"
       FROM bookings b
       JOIN garages g ON b.garage_id = g.id
       JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN quotes q ON b.quote_id = q.id
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN users u ON b.customer_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE ${filterCondition}
       ORDER BY b.scheduled_at DESC`,
      params
    );

    const formatted = result.rows.map((row) => ({
      ...row,
      status: row.status === 'inService' ? 'in_progress' : row.status,
      paymentStatus: row.cashPaymentStatus === 'pending' ? 'PENDING_CASH' : row.paymentStatus,
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


function parseTimeToMinutes(timeStr: any): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const str = timeStr.trim().toUpperCase();
  const isPM = str.includes('PM');
  const isAM = str.includes('AM');
  const cleanStr = str.replace(/AM|PM/g, '').trim();
  const parts = cleanStr.split(':');
  if (parts.length < 2) return null;

  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

async function createBookingInternal(req: any, res: any, data: {
  garageId?: string;
  vehicleId: string;
  scheduledAt: string;
  totalAmount: number;
  bookingType: string;
  quoteId?: string | null;
  currency?: string;
  serviceType?: string;
  issueDescription?: string;
  notes?: string;
  offerCode?: string;
  walletAmountToUse?: number;
  paymentMethod?: string;
  serviceIds?: string[];
}) {
  const customerId = req.user?.userId;
  let { garageId } = data;
  const { vehicleId, scheduledAt, bookingType, quoteId, currency, serviceType, issueDescription, notes, offerCode, walletAmountToUse, paymentMethod, serviceIds } = data;
  
  const extractedNotes = issueDescription || serviceType || notes || req.body?.issueDescription || req.body?.serviceType || req.body?.notes || '';
  let totalAmount = data.totalAmount;

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
    // Check if garage is suspended or deleted & fetch business hours
    const garageCheck = await query(`SELECT approval_status, name, business_hours FROM garages WHERE id = $1`, [garageId]);
    if (garageCheck.rows.length === 0) {
      return error(res, 'Garage not found', 'NOT_FOUND', 404);
    }
    const garageData = garageCheck.rows[0];
    const garageStatus = garageData.approval_status;
    if (garageStatus === 'suspended' || garageStatus === 'deleted' || garageStatus === 'inactive') {
      return error(res, 'This garage is not available for new bookings.', 'FORBIDDEN', 403);
    }

    // Backend Working Hours Validation
    const businessHours = garageData.business_hours;
    if (businessHours && scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (!isNaN(scheduledDate.getTime())) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[scheduledDate.getDay()];
        const dayDisplay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        const dayConfig = businessHours[dayName];

        if (dayConfig) {
          if (!dayConfig.open) {
            return error(
              res,
              `Booking is unavailable because ${garageData.name || 'the garage'} is closed on ${dayDisplay}.`,
              'BAD_REQUEST',
              400
            );
          }

          const bookingMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes();
          const startMinutes = parseTimeToMinutes(dayConfig.start);
          const endMinutes = parseTimeToMinutes(dayConfig.end);

          if (startMinutes !== null && endMinutes !== null) {
            if (bookingMinutes < startMinutes || bookingMinutes > endMinutes) {
              return error(
                res,
                `Booking time is outside ${garageData.name || 'the garage'}'s working hours (${dayConfig.start} - ${dayConfig.end} on ${dayDisplay}).`,
                'BAD_REQUEST',
                400
              );
            }
          }
        }
      }
    }

    let finalServiceType = extractedNotes || 'General Service';
    let serviceDetailsJSON: any = null;

    if (serviceIds && serviceIds.length > 0) {
      const servicesCheck = await query(
        `SELECT id, name, price FROM services WHERE id = ANY($1) AND garage_id = $2 AND is_active = true`,
        [serviceIds, garageId]
      );
      if (servicesCheck.rows.length !== serviceIds.length) {
         return error(res, 'One or more selected services are invalid or not offered by this garage.', 'BAD_REQUEST', 400);
      }
      
      let computedTotal = 0;
      const laborItems = servicesCheck.rows.map(s => {
        const p = Number(s.price) || 0;
        computedTotal += p;
        return { name: s.name, price: p, quantity: 1, total: p };
      });
      
      totalAmount = computedTotal;
      if (!extractedNotes) {
        finalServiceType = laborItems.map(l => l.name).join(', ');
      }
      serviceDetailsJSON = {
        breakdown: { labor: laborItems, parts: [] },
        parts_cost: 0,
        labor_cost: computedTotal,
        total_cost: computedTotal
      };
    }

    let finalAmount = Number(totalAmount);
    let offerId: string | null = null;
    let discountApplied = 0;

    // 1. Offer Validation
    if (offerCode) {
      const offerValidation = await validateOffer(offerCode, customerId, finalAmount, garageId);
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

    // Insert booking in 'requested' state. Payment happens post-service.
    const status = 'requested';
    const paymentStatus = 'UNPAID';

    const result = await query(
      `INSERT INTO bookings (customer_id, garage_id, vehicle_id, quote_id, booking_type, scheduled_at, status, payment_status, total_amount, currency, customer_note, offer_id, discount_applied, wallet_used, service_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        heldWalletAmount,
        serviceDetailsJSON
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
        razorpayOrderId: null,
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
              v.make as "vehicleMake", v.model as "vehicleModel", v.year as "vehicleYear", v.vin as "vehicleVin",
              u.name as "customerName", u.mobile_number as "customerPhone", p.avatar_url as "customerAvatar",
              q.details as "quoteDetails", q.amount as "quoteAmount", q.eta_days as "estimatedDays",
              b.customer_note as "customerNote",
              COALESCE(qr.issue_summary, b.customer_note) as "issueSummary",
              COALESCE(qr.issue_summary, b.customer_note) as "issueDescription"
       FROM bookings b
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN users u ON b.customer_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN quotes q ON b.quote_id = q.id
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       WHERE b.garage_id = $1 AND b.status IN ('requested', 'confirmed')
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
  const { garageId, vehicleId, scheduledAt, totalAmount, currency, serviceType, paymentMethod } = req.body;
  return createBookingInternal(req, res, {
    garageId,
    vehicleId,
    scheduledAt,
    totalAmount,
    bookingType: 'instant',
    quoteId: null,
    currency,
    serviceType,
    paymentMethod,
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
      paymentMethod: req.body.paymentMethod,
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
        b.payment_status as "paymentStatus",
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
        u.email as "customerEmail",
        p.city as "customerCity",
        g.city as "garageCity"
       FROM bookings b
       JOIN garages g ON b.garage_id = g.id
       JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN quotes q ON b.quote_id = q.id
       LEFT JOIN quote_requests qr ON q.quote_request_id = qr.id
       LEFT JOIN users u ON b.customer_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
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

    const allowedStatuses = ['requested', 'confirmed', 'in_progress', 'completed', 'readyForCollection', 'collected', 'cancelled'];
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

    // Verify existing booking and handle refunds if paying online
    const currentBookingRes = await query('SELECT payment_status, customer_id, status as old_status, total_amount, discount_applied, wallet_used, currency FROM bookings WHERE id = $1', [bookingId]);
    if (currentBookingRes.rows.length === 0) {
      return error(res, 'Booking not found', 'NOT_FOUND', 404);
    }
    const currentBooking = currentBookingRes.rows[0];

    if (status === 'cancelled' && currentBooking.payment_status === 'PAID') {
      const paymentRes = await query("SELECT provider_payment_id, id, amount FROM payments WHERE booking_id = $1 AND status = 'succeeded'", [bookingId]);
      if (paymentRes.rows.length > 0) {
        const paymentRecord = paymentRes.rows[0];
        try {
          const { issueRazorpayRefund } = require('../payments/razorpay.service');
          const refundResponse = await issueRazorpayRefund(paymentRecord.provider_payment_id);
          
          await query(
            'UPDATE payments SET status = $1, provider_refund_id = $2, updated_at = NOW() WHERE id = $3',
            ['refund_pending', refundResponse.id, paymentRecord.id]
          );
          await query(
            'UPDATE bookings SET payment_status = $1, updated_at = NOW() WHERE id = $2',
            ['REFUND_PENDING', bookingId]
          );

          // Insert wallet refund transaction
          const walletRes = await query('SELECT id FROM wallets WHERE user_id = $1', [currentBooking.customer_id]);
          if (walletRes.rows.length > 0) {
             const walletId = walletRes.rows[0].id;
             await query(`
               INSERT INTO wallet_transactions 
               (wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, status, description)
               VALUES ($1, 'REFUND', $2, (SELECT balance FROM wallets WHERE id = $1), (SELECT balance FROM wallets WHERE id = $1), 'BOOKING', $3, 'COMPLETED', 'Refund for Cancelled Booking (Razorpay pending)')
             `, [walletId, paymentRecord.amount, bookingId]);
          }
        } catch (refundErr) {
          console.error('Failed to initiate refund during cancellation:', refundErr);
          await query(
            'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2',
            ['refund_failed', paymentRecord.id]
          );
          await query(
            'UPDATE bookings SET payment_status = $1, updated_at = NOW() WHERE id = $2',
            ['REFUND_FAILED', bookingId]
          );
        }
      }
    }

    if ((status === 'collected' || status === 'readyForCollection') && currentBooking.payment_status !== 'PAID') {
      return error(res, 'Vehicle cannot be marked ready for collection or collected until payment is completed.', 'FORBIDDEN', 403);
    }

    let updateQuery = `UPDATE bookings SET status = $${params.length + 1}, updated_at = NOW()`;
    const updateParams = [...params, status];

    if (status === 'readyForCollection' && collectionTime) {
      updateQuery += `, collection_time = $${updateParams.length + 1}`;
      updateParams.push(collectionTime);
    }

    // Set PAYMENT_DUE when service completes (if unpaid)
    if (status === 'completed' && currentBooking.payment_status === 'UNPAID') {
      updateQuery += `, payment_status = 'PAYMENT_DUE'`;
    }

    updateQuery += ` WHERE id = $1${garageCheck} RETURNING id, status, updated_at as "updatedAt"`;

    const result = await query(updateQuery, updateParams);

    if (result.rows.length === 0) {
      return error(res, 'Booking not found', 'NOT_FOUND', 404);
    }

    // Invoice generation upon completion
    if (status === 'completed' && currentBooking.old_status !== 'completed') {
      const existingInvoice = await query(`SELECT id FROM invoices WHERE booking_id = $1`, [bookingId]);
      if (existingInvoice.rows.length === 0) {
        const invoiceNum = `INV-${Date.now()}-${bookingId.substring(0, 4).toUpperCase()}`;
        const totalAmount = currentBooking.total_amount || 0;
        const discountAmount = currentBooking.discount_applied || 0;
        const subtotal = Number(totalAmount) + Number(discountAmount);
        
        await query(
          `INSERT INTO invoices (booking_id, invoice_number, subtotal, discount_amount, total_amount, currency)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [bookingId, invoiceNum, subtotal, discountAmount, totalAmount, currentBooking.currency || 'INR']
        );
      }
      
      // Attempt referral reward and cashback logic when service finishes.
      // (The actual service logic will only credit if it is ALSO marked PAID)
      ReferralService.processReferralReward(currentBooking.customer_id, bookingId).catch(err => {
        console.error('Failed to process referral reward on status completion:', err);
      });
      processCashback(bookingId).catch(err => {
        console.error('Failed to process cashback on status completion:', err);
      });
    }

    if (status === 'inService' || status === 'completed' || status === 'readyForCollection' || status === 'collected') {
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

      if (status === 'inService') {
        await NotificationsService.createNotification({
          userId: custId,
          type: 'Booking',
          title: 'Service In Progress',
          description: 'Your vehicle is currently being serviced.'
        }).catch(err => console.error('Failed to create notification', err));
      } else if (status === 'completed') {
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
      } else if (status === 'readyForCollection') {
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
      } else if (status === 'collected') {
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

// POST /bookings/:bookingId/pay — create payment intent for existing unpaid booking
bookingsRouter.post('/:bookingId/pay', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { walletAmountToUse } = req.body;
    const userId = req.user?.userId as string;

    const bookingRes = await query(
      `SELECT b.id, b.payment_status, b.status, COALESCE(i.total_amount, b.total_amount) as total_amount, b.discount_applied, b.wallet_used
       FROM bookings b 
       LEFT JOIN invoices i ON i.booking_id = b.id
       WHERE b.id = $1 AND b.customer_id = $2`,
      [bookingId, userId]
    );

    if (bookingRes.rows.length === 0) {
      return error(res, 'Booking not found or unauthorized', 'NOT_FOUND', 404);
    }

    const booking = bookingRes.rows[0];

    if (booking.payment_status === 'PAID') {
      return error(res, 'Booking is already paid', 'BAD_REQUEST', 400);
    }
    
    if (booking.status !== 'completed' && booking.status !== 'readyForCollection') {
      return error(res, 'Service must be completed before payment', 'BAD_REQUEST', 400);
    }

    let currentWalletUsed = Number(booking.wallet_used || 0);
    let finalAmount = Number(booking.total_amount) - Number(booking.discount_applied || 0);

    if (walletAmountToUse !== undefined && walletAmountToUse > currentWalletUsed) {
       const additionalWallet = walletAmountToUse - currentWalletUsed;
       const maxAllowed = finalAmount - currentWalletUsed;
       const toHold = Math.min(additionalWallet, maxAllowed);
       
       if (toHold > 0) {
         try {
           await holdWalletBalance(userId, toHold, 'BOOKING', bookingId);
           currentWalletUsed += toHold;
           await query(`UPDATE bookings SET wallet_used = $1, updated_at = NOW() WHERE id = $2`, [currentWalletUsed, bookingId]);
         } catch (e) {
           return error(res, 'Insufficient wallet balance or failed to apply wallet', 'BAD_REQUEST', 400);
         }
       }
    }

    const finalAmountToPay = finalAmount - currentWalletUsed;

    if (finalAmountToPay <= 0) {
       // Fully paid by wallet
       await query(`UPDATE bookings SET payment_status = 'PAID', updated_at = NOW() WHERE id = $1`, [bookingId]);
       await query(`UPDATE wallet_transactions SET status = 'COMPLETED' WHERE reference_id = $1 AND status = 'PENDING'`, [bookingId]);
       return success(res, { fullyPaidViaWallet: true }, 200);
    }

    const amountInPaise = Math.round(finalAmountToPay * 100);

    // 2. Create Razorpay order
    const razorpayOrder = await createRazorpayOrder(amountInPaise, bookingId.substring(0, 40), {
      bookingId,
      customerId: userId,
      type: 'existing_booking_payment'
    });

    if (!razorpayOrder) {
      return error(res, 'Failed to initialize payment', 'INTERNAL_SERVER_ERROR', 500);
    }

    // 3. Update payment_intent_id
    await query(`UPDATE bookings SET payment_intent_id = $1 WHERE id = $2`, [razorpayOrder.id, bookingId]);

    return success(res, { razorpayOrderId: razorpayOrder.id }, 200);

  } catch (err) {
    console.error('Error generating payment intent for existing booking:', err);
    return error(res, 'Payment initialization failed', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// POST /bookings/:bookingId/apply-offer — apply offer before payment
bookingsRouter.post('/:bookingId/apply-offer', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { offerCode } = req.body;
    const userId = req.user?.userId as string;

    const bookingRes = await query(
      `SELECT id, garage_id, total_amount, discount_applied FROM bookings WHERE id = $1 AND customer_id = $2 AND payment_status = 'UNPAID'`,
      [bookingId, userId]
    );

    if (bookingRes.rows.length === 0) {
      return error(res, 'Booking not found or already paid', 'NOT_FOUND', 404);
    }

    const booking = bookingRes.rows[0];
    if (Number(booking.discount_applied) > 0) {
      return error(res, 'An offer is already applied to this booking', 'BAD_REQUEST', 400);
    }

    const offerValidation = await validateOffer(offerCode, userId, Number(booking.total_amount), booking.garage_id);
    
    await query(
      `UPDATE bookings SET offer_id = $1, discount_applied = $2, updated_at = NOW() WHERE id = $3`,
      [offerValidation.offerId, offerValidation.discount, bookingId]
    );

    return success(res, { message: 'Offer applied', discount: offerValidation.discount }, 200);
  } catch (err: any) {
    return error(res, err.message || 'Failed to apply offer', 'BAD_REQUEST', 400);
  }
});

// POST /bookings/:bookingId/select-cash — customer selects cash payment
bookingsRouter.post('/:bookingId/select-cash', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.userId;
    
    // 1. Verify booking ownership and status
    const bookingRes = await query(
      `SELECT b.id, b.payment_status, b.status, COALESCE(i.total_amount, b.total_amount) as total_amount 
       FROM bookings b 
       LEFT JOIN invoices i ON i.booking_id = b.id
       WHERE b.id = $1 AND b.customer_id = $2`,
      [bookingId, userId]
    );

    if (bookingRes.rows.length === 0) {
      return error(res, 'Booking not found or unauthorized', 'NOT_FOUND', 404);
    }

    const booking = bookingRes.rows[0];

    if (booking.payment_status === 'PAID') {
      return error(res, 'Booking is already paid', 'BAD_REQUEST', 400);
    }
    
    if (booking.status !== 'completed' && booking.status !== 'readyForCollection') {
      return error(res, 'Service must be completed before payment selection', 'BAD_REQUEST', 400);
    }

    // Check for existing pending cash payment
    const existingPaymentRes = await query(
      `SELECT id FROM payments WHERE booking_id = $1 AND method = 'cash' AND status = 'pending'`,
      [bookingId]
    );

    if (existingPaymentRes.rows.length === 0) {
      // transaction_id is NOT NULL and unique — use a deterministic cash reference
      const cashRef = `cash_pending_${bookingId}`;
      await query(
        `INSERT INTO payments (customer_user_id, booking_id, method, transaction_id, amount, status)
         VALUES ($1, $2, 'cash', $3, $4, 'pending')
         ON CONFLICT (transaction_id) DO NOTHING`,
        [userId, bookingId, cashRef, booking.total_amount]
      );
    }

    return success(res, { message: 'Cash payment preference recorded' }, 200);

  } catch (err) {
    console.error('Error selecting cash for existing booking:', err);
    return error(res, 'Cash selection failed', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// POST /bookings/:bookingId/confirm-cash — garage confirms cash receipt
bookingsRouter.post('/:bookingId/confirm-cash', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userRoles = req.user?.roles || [];
    
    if (!userRoles.includes('garage') && !userRoles.includes('admin')) {
      return error(res, 'Only garages or admins can confirm cash payments', 'FORBIDDEN', 403);
    }
    
    const garageId = req.user?.garageId;
    let garageCheck = '';
    const params: any[] = [bookingId];
    
    if (userRoles.includes('garage') && !userRoles.includes('admin')) {
      if (!garageId) return error(res, 'Garage not found', 'BAD_REQUEST', 400);
      garageCheck = ' AND garage_id = $2';
      params.push(garageId);
    }

    const bookingRes = await query(
      `SELECT b.payment_status, COALESCE(i.total_amount, b.total_amount) as total_amount, b.customer_id, b.status 
       FROM bookings b 
       LEFT JOIN invoices i ON i.booking_id = b.id 
       WHERE b.id = $1${garageCheck}`, 
      params
    );
    
    if (bookingRes.rows.length === 0) {
      return error(res, 'Booking not found or unauthorized', 'NOT_FOUND', 404);
    }
    
    const booking = bookingRes.rows[0];
    
    if (booking.payment_status === 'PAID') {
      return error(res, 'Booking is already paid', 'BAD_REQUEST', 400);
    }
    
    if (booking.status !== 'completed' && booking.status !== 'readyForCollection' && booking.status !== 'collected') {
      return error(res, 'Service must be completed before payment', 'BAD_REQUEST', 400);
    }
    
    await query(`UPDATE bookings SET payment_status = 'PAID', updated_at = NOW() WHERE id = $1`, [bookingId]);
    
    await processCashback(bookingId);
    
    // Process referral reward asynchronously
    ReferralService.processReferralReward(booking.customer_id, bookingId).catch(err => {
      console.error('Referral reward failed for cash booking', bookingId, err);
    });

    // Create or update payment record for cash
    const cashTransactionId = `cash_confirmed_${bookingId}`;
    const existingPayment = await query(
      `SELECT id, status FROM payments WHERE booking_id = $1 AND method = 'cash'`,
      [bookingId]
    );
    if (existingPayment.rows.length > 0) {
      // Update the existing pending record to succeeded
      await query(
        `UPDATE payments SET status = 'succeeded', transaction_id = $1, updated_at = NOW() WHERE id = $2`,
        [cashTransactionId, existingPayment.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO payments (customer_user_id, booking_id, method, transaction_id, amount, status)
         VALUES ($1, $2, 'cash', $3, $4, 'succeeded')
         ON CONFLICT (transaction_id) DO NOTHING`,
        [booking.customer_id, bookingId, cashTransactionId, booking.total_amount]
      );
    }
    
    return success(res, { message: 'Cash payment confirmed' }, 200);
  } catch (err: any) {
    console.error('[confirm-cash] error:', err?.message, err?.code);
    return error(res, 'Failed to confirm cash payment', 'INTERNAL_SERVER_ERROR', 500);
  }
});
// POST /api/v1/bookings/:id/refund-requests - Customer requests a refund
bookingsRouter.post('/:id/refund-requests', authenticate, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const customerId = req.user?.userId;
    const { reason, explanation, evidenceUrls } = req.body;

    if (!reason) {
      return error(res, 'Refund reason is required', 'BAD_REQUEST', 400);
    }

    // 1. Verify Booking Eligibility
    const bookingRes = await query(
      `SELECT b.id, b.garage_id, b.total_amount, b.payment_status, p.amount as payment_amount, p.status as p_status 
       FROM bookings b 
       LEFT JOIN payments p ON p.booking_id = b.id AND p.status IN ('paid', 'succeeded') 
       WHERE b.id = $1 AND b.customer_id = $2`,
      [bookingId, customerId]
    );

    if (bookingRes.rows.length === 0) {
      return error(res, 'Booking not found or you are not authorized', 'NOT_FOUND', 404);
    }

    const booking = bookingRes.rows[0];

    // Must be paid to request refund
    if (booking.payment_status !== 'PAID') {
      return error(res, 'Booking is not eligible for refund (not paid)', 'BAD_REQUEST', 400);
    }

    // Check for existing pending requests
    const existingReq = await query(
      `SELECT id, status FROM refund_requests WHERE booking_id = $1 AND status IN ('pending', 'info_requested')`,
      [bookingId]
    );
    if (existingReq.rows.length > 0) {
      return error(res, 'A refund request is already in progress', 'BAD_REQUEST', 400);
    }

    // Calculate refundable amount using backend logic (e.g. amount paid)
    const refundAmount = booking.payment_amount || booking.total_amount;

    // Create the refund request
    const insertRes = await query(
      `INSERT INTO refund_requests (booking_id, garage_id, customer_id, reason, explanation, evidence_urls, calculated_refund_amount, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
      [
        bookingId,
        booking.garage_id,
        customerId,
        reason,
        explanation || null,
        JSON.stringify(evidenceUrls || []),
        refundAmount
      ]
    );

    // Notify Garage
    await query(
      `INSERT INTO notifications (garage_id, type, title, description) 
       VALUES ($1, 'refund_requested', 'New Refund Request', 'Customer requested a refund for booking ' || $2)`,
      [booking.garage_id, bookingId]
    );

    return success(res, insertRes.rows[0], 201);
  } catch (err: any) {
    console.error('[refund-request] Error:', err);
    return error(res, 'Failed to submit refund request', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Added at bottom for testing

