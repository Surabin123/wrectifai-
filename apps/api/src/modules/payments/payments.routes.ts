import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate, requireRole } from '../../middleware/auth';
import { getDbPool } from '../../config/database';
import { createRazorpayOrder, verifyWebhookSignature, fetchRazorpayPayment } from './razorpay.service';
import { getEnv } from '../../config/env';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { ReferralService } from '../../services/referral.service';
import { processCashback } from '../offers/offers.service';

export const paymentsRouter = Router();
const env = getEnv();

// POST /api/v1/payments/orders - Generate Razorpay Order
paymentsRouter.post('/orders', authenticate, async (req, res) => {
  const { amount, bookingId } = req.body;
  if (!bookingId || amount === undefined) {
    return error(res, 'Booking ID and amount are required', 'BAD_REQUEST', 400);
  }
  if (typeof bookingId !== 'string' || typeof amount !== 'number') {
    return error(res, 'Invalid booking ID or amount format', 'BAD_REQUEST', 400);
  }

  try {
    const bookingResult = await getDbPool().query(
      `SELECT b.id, b.total_amount, b.discount_applied, b.wallet_used, b.payment_status, b.customer_id
       FROM bookings b WHERE b.id = $1`, [bookingId]
    );
    const booking = bookingResult.rows[0];
    const userId = req.user?.userId;
    const roles = req.user?.roles || [];
    if (!booking || (!roles.includes('admin') && booking.customer_id !== userId)) {
      return error(res, 'Booking not found or unauthorized', 'NOT_FOUND', 404);
    }
    if (booking.payment_status === 'PAID') {
      return error(res, 'Booking is already paid', 'BAD_REQUEST', 400);
    }
    const payable = Number(booking.total_amount) - Number(booking.discount_applied || 0) - Number(booking.wallet_used || 0);
    const requestedAmount = Number(amount);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || Math.abs(requestedAmount - payable) > 0.01) {
      return error(res, 'Payment amount does not match the booking balance', 'BAD_REQUEST', 400);
    }
    const amountInPaise = Math.round(payable * 100);
    const receiptId = bookingId ? bookingId.substring(0, 40) : `rcpt_${Date.now()}`;
    const existingIntent = await getDbPool().query(
      `SELECT provider_order_id FROM payments WHERE booking_id = $1 AND status = 'created' AND provider_order_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`, [bookingId]
    );
    if (existingIntent.rows[0]?.provider_order_id) {
      return success(res, { id: existingIntent.rows[0].provider_order_id, amount: amountInPaise, currency: 'INR', status: 'created' }, 201);
    }

    // Persist the local intent before contacting Razorpay. The notes carry the
    // same stable identifiers so a webhook can recover after a later DB error.
    await getDbPool().query(
      `INSERT INTO payments (customer_user_id, booking_id, method, transaction_id, amount, currency, status)
       VALUES ($1, $2, 'razorpay', $3, $4, 'INR', 'created')
       ON CONFLICT (transaction_id) DO NOTHING`,
      [booking.customer_id, bookingId, `booking_intent_${bookingId}`, payable]
    );
    
    const order = await createRazorpayOrder(amountInPaise, receiptId, {
      userId,
      bookingId
    });

    const pool = getDbPool();
    await pool.query('UPDATE bookings SET payment_intent_id = $1 WHERE id = $2 AND customer_id = $3', [order.id, bookingId, userId]);
    await pool.query('UPDATE payments SET provider_order_id = $1 WHERE booking_id = $2 AND transaction_id = $3', [order.id, bookingId, `booking_intent_${bookingId}`]);

    return success(
      res,
      {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
      },
      201
    );
  } catch (err) {
    return error(res, 'Failed to create payment order', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// POST /api/v1/payments/verify - Verify Razorpay payment signature & payment status
paymentsRouter.post('/verify', authenticate, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return error(res, 'Missing payment verification details', 'BAD_REQUEST', 400);
  }
  if (typeof razorpay_order_id !== 'string' || typeof razorpay_payment_id !== 'string' || typeof razorpay_signature !== 'string') {
    return error(res, 'Invalid verification details format', 'BAD_REQUEST', 400);
  }

  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!secret) {
    console.error('RAZORPAY_KEY_SECRET is not defined in backend');
    return error(res, 'Razorpay key secret is not configured on the server', 'CONFIGURATION_ERROR', 500);
  }

  // Step 1: Verify HMAC signature — only Razorpay can produce this with the shared secret
  const crypto = require('crypto');
  const generated_signature = crypto
    .createHmac('sha256', secret)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    console.error('Payment signature mismatch', { orderId: razorpay_order_id, paymentId: razorpay_payment_id });
    return error(res, 'Payment signature verification failed', 'BAD_REQUEST', 400);
  }

  // Step 2: Update database — signature is authoritative proof of Razorpay success
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bookingRes = await client.query(
      `SELECT id, customer_id, total_amount, discount_applied, wallet_used, payment_status, status
       FROM bookings WHERE payment_intent_id = $1
       AND ($2 = true OR customer_id = $3) FOR UPDATE`,
      [razorpay_order_id, (req.user?.roles || []).includes('admin'), req.user?.userId]
    );
    
    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return error(res, 'Booking for this payment order was not found', 'NOT_FOUND', 404);
    }
    
    const booking = bookingRes.rows[0];
    
    // Idempotency: if already paid, return success without double-writing
    if (booking.payment_status === 'PAID') {
      await client.query('ROLLBACK');
      return success(res, { verified: true }, 200);
    }
    
    const paymentAmount = Number(booking.total_amount || 0) - Number(booking.discount_applied || 0) - Number(booking.wallet_used || 0);
    
    // Check for duplicate payment record (idempotency on retries)
    const paymentCheck = await client.query(
      'SELECT id FROM payments WHERE provider_payment_id = $1 OR provider_order_id = $2 OR transaction_id = $1',
      [razorpay_payment_id, razorpay_order_id]
    );

    if (paymentCheck.rows.length === 0) {
      // transaction_id is the unique key; use razorpay_payment_id as the canonical transaction ID
      await client.query(
        `INSERT INTO payments (customer_user_id, booking_id, method, transaction_id, provider_order_id, provider_payment_id, amount, status, signature_status)
         VALUES ($1, $2, 'razorpay', $3, $4, $5, $6, 'succeeded', 'valid')`,
        [booking.customer_id, booking.id, razorpay_payment_id, razorpay_order_id, razorpay_payment_id, paymentAmount]
      );
    }

    // Mark booking as paid
    await client.query(
      'UPDATE bookings SET payment_status = $1 WHERE id = $2',
      ['PAID', booking.id]
    );

    await processCashback(booking.id);
    
    // Process referral reward asynchronously
    ReferralService.processReferralReward(booking.customer_id, booking.id).catch(err => {
      console.error('Referral reward failed for online booking', booking.id, err);
    });
    
    // Complete wallet hold if any
    await client.query(
      'UPDATE wallet_transactions SET status = $1 WHERE reference_id = $2 AND status = $3',
      ['COMPLETED', booking.id, 'PENDING']
    );
    
    await client.query('COMMIT');
    return success(res, { verified: true }, 200);
  } catch (err: any) {
    await client.query('ROLLBACK');
    // Log the safe diagnostic without exposing secrets
    console.error('[payments/verify] DB error:', err?.message, err?.code);
    return error(res, 'Failed to record payment. Please contact support.', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    client.release();
  }
});

// POST /api/v1/payments/fail - Handle Razorpay frontend payment failures
paymentsRouter.post('/fail', authenticate, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, error_reason } = req.body;
  
  if (!razorpay_order_id) {
    return error(res, 'Missing order id', 'BAD_REQUEST', 400);
  }
  if (typeof razorpay_order_id !== 'string') {
    return error(res, 'Invalid order id format', 'BAD_REQUEST', 400);
  }

  const pool = getDbPool();
  try {
    const bookingRes = await pool.query(
      `SELECT id, customer_id, total_amount, discount_applied, wallet_used
       FROM bookings WHERE payment_intent_id = $1
       AND ($2 = true OR customer_id = $3)`,
      [razorpay_order_id, (req.user?.roles || []).includes('admin'), req.user?.userId]
    );

    if (bookingRes.rows.length === 0) {
      return success(res, { marked: true }, 200);
    }
    
    const booking = bookingRes.rows[0];
    const paymentAmount = Number(booking.total_amount || 0) - Number(booking.discount_applied || 0) - Number(booking.wallet_used || 0);

    const paymentCheck = await pool.query(
      'SELECT id FROM payments WHERE provider_order_id = $1 AND (provider_payment_id = $2 OR transaction_id = $2)',
      [razorpay_order_id, razorpay_payment_id || 'unknown']
    );
    if (paymentCheck.rows.length === 0) {
      const failTxId = razorpay_payment_id || `fail_${razorpay_order_id}`;
      await pool.query(
        `INSERT INTO payments (customer_user_id, booking_id, method, transaction_id, provider_order_id, provider_payment_id, amount, status)
         VALUES ($1, $2, 'razorpay', $3, $4, $5, $6, 'failed')
         ON CONFLICT (transaction_id) DO NOTHING`,
        [booking.customer_id, booking.id, failTxId, razorpay_order_id, razorpay_payment_id || 'unknown', paymentAmount]
      );
    }
    
    // Do NOT permanently fail the booking. Leave booking.payment_status untouched so the user can retry.
    return success(res, { marked: true }, 200);
  } catch (err) {
    console.error('Payment failure logging error:', err);
    return error(res, 'Failed to log payment failure', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// POST /api/v1/payments/booking/:id/refund - Process a refund by booking ID
paymentsRouter.post('/booking/:id/refund', authenticate, requireRole(['customer', 'user', 'garage', 'admin']), async (req, res) => {
  const bookingId = req.params.id;
  const { reason } = req.body;
  if (typeof reason !== 'string' || reason.trim() === '') {
    return error(res, 'Refund reason is required and must be text', 'BAD_REQUEST', 400);
  }

  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const paymentRes = await client.query(
      `SELECT p.* FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN garages g ON g.id = b.garage_id
       WHERE p.booking_id = $1 AND p.status IN ('paid', 'succeeded')
         AND ($4 = true OR b.customer_id = $2 OR g.owner_user_id = $2)
       FOR UPDATE`,
      [bookingId, req.user!.userId, req.user!.garageId || null, (req.user!.roles || []).includes('admin')]
    );

    if (paymentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return error(res, 'Payment not found, already refunded, or not in a refundable state', 'BAD_REQUEST', 400);
    }

    const payment = paymentRes.rows[0];

    // Reserve the refund atomically, then release the database lock before
    // waiting on Razorpay. A concurrent request will see refund_pending.
    const reserveRes = await client.query(
      `UPDATE payments SET status = 'refund_pending', refund_reason = $1, updated_at = NOW()
       WHERE id = $2 AND status IN ('paid', 'succeeded') RETURNING id`,
      [reason, payment.id]
    );
    if (reserveRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return error(res, 'Refund is already being processed', 'CONFLICT', 409);
    }
    await client.query('COMMIT');

    const rzp = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });

    // Refund logic via Razorpay
    let refund;
    try {
      refund = await rzp.payments.refund(payment.provider_payment_id, {
        amount: Math.round(Number(payment.amount) * 100),
        speed: 'normal',
        notes: {
          reason: reason
        }
      });
    } catch (rzpErr: any) {
      await pool.query(
        `UPDATE payments SET status = 'refund_failed', updated_at = NOW() WHERE id = $1 AND status = 'refund_pending'`,
        [payment.id]
      );
      const errorMessage = rzpErr?.error?.description || rzpErr?.message || (typeof rzpErr === 'string' ? rzpErr : JSON.stringify(rzpErr)) || 'Unknown Razorpay Error';
      return error(res, 'Razorpay refund API failed', 'BAD_REQUEST', 400);
    }

    const paymentRefundStatus = refund.status === 'processed' ? 'refunded' : 'refund_pending';
    const bookingRefundStatus = refund.status === 'processed' ? 'REFUNDED' : 'REFUND_PENDING';
    
    await client.query('BEGIN');
    await client.query(
      'UPDATE payments SET status = $1, provider_refund_id = $2, refund_reason = $3, updated_at = NOW() WHERE id = $4',
      [paymentRefundStatus, refund.id, reason, payment.id]
    );

    await client.query(
      'UPDATE bookings SET payment_status = $1, updated_at = NOW() WHERE id = $2',
      [bookingRefundStatus, payment.booking_id]
    );

    await client.query('COMMIT');
    return success(res, { refund }, 200);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(`[payments/refund] Failed for bookingId=${bookingId}:`, err?.message, err?.code);
    return error(res, 'Failed to process refund', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    client.release();
  }
});


// POST /api/v1/payments/webhook - Server-side Razorpay Webhook Endpoint
paymentsRouter.post('/webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const eventId = req.headers['x-razorpay-event-id'] as string;
  
  if (!signature || !eventId) {
    return res.status(400).send('Missing headers');
  }

  const webhookBody = req.body;
  const rawBody = (req as any).rawBody || JSON.stringify(webhookBody);
  const secret = env.razorpayWebhookSecret;
  if (!secret) {
    return res.status(503).send('Webhook verification is not configured');
  }

  const isValid = verifyWebhookSignature(rawBody, signature, secret);
  if (!isValid) {
    return res.status(400).send('Invalid signature');
  }

  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Idempotency Check
    const eventInsert = await client.query(
      'INSERT INTO webhook_events (event_id, provider, type, payload) VALUES ($1, $2, $3, $4) ON CONFLICT (event_id) DO NOTHING RETURNING id', [
      eventId,
      'razorpay',
      webhookBody.event,
      webhookBody
      ]
    );
    if (eventInsert.rows.length === 0) {
      await client.query('COMMIT');
      return res.status(200).send('OK');
    }

    const paymentEntity = webhookBody.payload?.payment?.entity;
    const orderEntity = webhookBody.payload?.order?.entity;
    
    if (webhookBody.event === 'payment.captured' || webhookBody.event === 'order.paid') {
      const providerIntentId = paymentEntity?.order_id || orderEntity?.id;
      if (!providerIntentId || !paymentEntity?.id || !Number.isFinite(Number(paymentEntity.amount))) {
        throw new Error('Razorpay payment webhook is missing provider identifiers or amount');
      }
      const amount = Number(paymentEntity.amount) / 100;

      const bookingRes = await client.query(
        'SELECT id, customer_id, payment_status, status, currency FROM bookings WHERE payment_intent_id = $1 FOR UPDATE',
        [providerIntentId]
      );
      
      if (bookingRes.rows.length > 0) {
        const booking = bookingRes.rows[0];
        if (!paymentEntity.currency || String(paymentEntity.currency).toUpperCase() !== String(booking.currency || 'INR').toUpperCase()) {
          throw new Error('Razorpay payment currency does not match the booking currency');
        }
        
        if (booking.payment_status === 'PAID' || booking.payment_status === 'REFUNDED') {
          // Already paid, ignore safely
        } else {
          // Update booking status
          await client.query(
            'UPDATE bookings SET payment_status = $1 WHERE id = $2',
            ['PAID', booking.id]
          );

          await processCashback(booking.id);

          const paymentCheck = await client.query(
            'SELECT id FROM payments WHERE provider_payment_id = $1 OR provider_intent_id = $1',
            [paymentEntity.id]
          );
          if (paymentCheck.rows.length === 0) {
            await client.query(
              `INSERT INTO payments (customer_user_id, booking_id, method, transaction_id, provider_order_id, provider_payment_id, amount, status)
               VALUES ($1, $2, 'razorpay', $3, $4, $5, $6, 'succeeded')`,
              [booking.customer_id, booking.id, paymentEntity.id, providerIntentId, paymentEntity.id, amount]
            );
          }

          // Commit wallet transaction
          await client.query(
            'UPDATE wallet_transactions SET status = $1 WHERE reference_id = $2 AND status = $3',
            ['COMPLETED', booking.id, 'PENDING']
          );
        }
      } else {
        // Recovery path for orders/top-ups whose local binding failed after
        // Razorpay accepted the payment. Provider order IDs are unique.
        const paymentRes = await client.query(
          `SELECT id, order_id, customer_user_id, amount FROM payments
           WHERE provider_order_id = $1 FOR UPDATE`, [providerIntentId]
        );
        if (paymentRes.rows.length > 0 && paymentRes.rows[0].order_id) {
          await client.query(
            `UPDATE payments SET provider_payment_id = $1, status = CASE WHEN status IN ('refunded','succeeded') THEN status ELSE 'succeeded' END, updated_at = NOW()
             WHERE id = $2`, [paymentEntity.id, paymentRes.rows[0].id]
          );
          await client.query(
            `UPDATE orders SET payment_status = 'PAID', status = CASE WHEN status = 'PENDING' THEN 'PENDING_ACCEPTANCE' ELSE status END, updated_at = NOW()
             WHERE id = $1 AND payment_status NOT IN ('PAID','REFUNDED')`, [paymentRes.rows[0].order_id]
          );
        }
        const topupRes = await client.query(
          `SELECT wt.id, wt.wallet_id, wt.amount FROM wallet_transactions wt
           WHERE wt.reference_type = 'WALLET_TOPUP' AND wt.reference_id = $1 AND wt.status = 'PENDING' FOR UPDATE`, [providerIntentId]
        );
        if (topupRes.rows.length > 0) {
          const topup = topupRes.rows[0];
          const walletRes = await client.query('SELECT balance FROM wallets WHERE id = $1 FOR UPDATE', [topup.wallet_id]);
          const before = Number(walletRes.rows[0].balance);
          const after = before + Number(topup.amount);
          await client.query('UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2', [after, topup.wallet_id]);
          await client.query(`UPDATE wallet_transactions SET type='CREDIT', status='COMPLETED', reference_type='TOPUP', reference_id=$1, balance_before=$2, balance_after=$3 WHERE id=$4 AND status='PENDING'`, [paymentEntity.id, before, after, topup.id]);
        }

        // The post-provider binding may itself have failed. Razorpay echoes
        // our stable notes, allowing recovery without a new schema/table.
        const notes = paymentEntity?.notes || orderEntity?.notes || {};
        if (notes.bookingId) {
          await client.query(`UPDATE bookings SET payment_intent_id=$1, updated_at=NOW()
            WHERE id=$2 AND payment_status NOT IN ('PAID','REFUNDED')`, [providerIntentId, notes.bookingId]);
          await client.query(`UPDATE payments SET provider_order_id=$1, provider_payment_id=$2, status='succeeded', signature_status='valid'
            WHERE booking_id=$3 AND status='created' AND provider_order_id IS NULL`, [providerIntentId, paymentEntity.id, notes.bookingId]);
        }
        if (notes.order_id) {
          await client.query(`UPDATE payments SET provider_order_id=$1, provider_payment_id=$2, transaction_id=$1, status='succeeded'
            WHERE order_id=$3 AND status='created' AND provider_order_id IS NULL`, [providerIntentId, paymentEntity.id, notes.order_id]);
          await client.query(`UPDATE orders SET payment_status='PAID', status=CASE WHEN status='PENDING' THEN 'PENDING_ACCEPTANCE' ELSE status END, updated_at=NOW()
            WHERE id=$1 AND payment_status NOT IN ('PAID','REFUNDED')`, [notes.order_id]);
        }
        if (notes.type === 'wallet_topup' && notes.userId) {
          await client.query(`UPDATE payments SET provider_order_id=$1, provider_payment_id=$2, transaction_id=$1, status='succeeded'
            WHERE customer_user_id=$3 AND amount=$4 AND status='created' AND provider_order_id IS NULL`, [providerIntentId, paymentEntity.id, notes.userId, amount]);
          const wt = await client.query(`SELECT wt.id, wt.wallet_id, wt.amount FROM wallet_transactions wt JOIN wallets w ON w.id=wt.wallet_id
            WHERE w.user_id=$1 AND wt.reference_type='WALLET_TOPUP' AND wt.status='PENDING' AND wt.reference_id <> $2
            ORDER BY wt.created_at DESC LIMIT 1 FOR UPDATE`, [notes.userId, providerIntentId]);
          if (wt.rows.length) {
            const row=wt.rows[0]; const w=await client.query('SELECT balance FROM wallets WHERE id=$1 FOR UPDATE',[row.wallet_id]);
            const before=Number(w.rows[0].balance), after=before+Number(row.amount);
            await client.query('UPDATE wallets SET balance=$1,updated_at=NOW() WHERE id=$2',[after,row.wallet_id]);
            await client.query(`UPDATE wallet_transactions SET type='CREDIT',status='COMPLETED',reference_type='TOPUP',reference_id=$1,balance_before=$2,balance_after=$3 WHERE id=$4 AND status='PENDING'`,[paymentEntity.id,before,after,row.id]);
          }
        }
      }
    } else if (webhookBody.event === 'payment.failed') {
      const providerIntentId = paymentEntity?.order_id || orderEntity?.id;
      if (!providerIntentId || !paymentEntity?.id) {
        throw new Error('Razorpay failed-payment webhook is missing provider identifiers');
      }

      const bookingRes = await client.query('SELECT id, customer_id, payment_status, status FROM bookings WHERE payment_intent_id = $1', [providerIntentId]);
      
      if (bookingRes.rows.length > 0) {
        const booking = bookingRes.rows[0];
        
        if (['PAID', 'REFUNDED', 'FAILED'].includes(booking.payment_status) || booking.status === 'cancelled') {
           // Already handled
        } else {
          const failedPaymentCheck = await client.query(
            'SELECT id FROM payments WHERE provider_payment_id = $1 OR provider_intent_id = $1',
            [paymentEntity.id]
          );
          if (failedPaymentCheck.rows.length === 0) {
            await client.query(
              `INSERT INTO payments (customer_user_id, booking_id, method, transaction_id, provider_order_id, provider_payment_id, amount, status)
               VALUES ($1, $2, 'razorpay', $3, $4, $5, $6, 'failed')`,
              [booking.customer_id, booking.id, paymentEntity.id, providerIntentId, paymentEntity.id, paymentEntity.amount / 100]
            );
          }

          await client.query(
            'UPDATE bookings SET payment_status = $1 WHERE id = $2',
            ['FAILED', booking.id]
          );

          // Release wallet hold
          const txRes = await client.query(
            'UPDATE wallet_transactions SET status = $1 WHERE reference_id = $2 AND status = $3 RETURNING amount, wallet_id',
            ['FAILED', booking.id, 'PENDING']
          );

          if (txRes.rows.length > 0) {
            const { amount, wallet_id } = txRes.rows[0];
            await client.query(
              'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
              [amount, wallet_id]
            );
          }
        }
      }
    } else if (webhookBody.event === 'refund.processed') {
      const refundEntity = webhookBody.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      const refundId = refundEntity?.id;

      if (paymentId) {
        const updateRes = await client.query(
          "UPDATE payments SET status = 'refunded', provider_refund_id = $1, updated_at = NOW() WHERE provider_payment_id = $2 AND status != 'refunded' RETURNING booking_id, amount",
          [refundId, paymentId]
        );
        if (updateRes.rows.length > 0) {
          const bookingId = updateRes.rows[0].booking_id;
          const refundedAmount = updateRes.rows[0].amount;
          await client.query("UPDATE bookings SET payment_status = 'REFUNDED', updated_at = NOW() WHERE id = $1", [bookingId]);

          // Create credit note
          const invoiceRes = await client.query('SELECT * FROM invoices WHERE booking_id = $1 AND type = \'invoice\'', [bookingId]);
          if (invoiceRes.rows.length > 0) {
            const origInv = invoiceRes.rows[0];
            await client.query(
              `INSERT INTO invoices (booking_id, invoice_number, subtotal, tax_amount, platform_fee, discount_amount, total_amount, currency, type, original_invoice_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'credit_note', $9) ON CONFLICT DO NOTHING`,
              [
                bookingId,
                'CN-' + origInv.invoice_number,
                -Math.abs(Number(origInv.subtotal)),
                -Math.abs(Number(origInv.tax_amount)),
                -Math.abs(Number(origInv.platform_fee)),
                -Math.abs(Number(origInv.discount_amount)),
                -refundedAmount,
                origInv.currency,
                origInv.id
              ]
            );
          }
        }
      }
    } else if (webhookBody.event === 'refund.failed') {
      const refundEntity = webhookBody.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      const refundId = refundEntity?.id;

      if (paymentId) {
        const updateRes = await client.query(
          "UPDATE payments SET status = 'refund_failed', provider_refund_id = $1, updated_at = NOW() WHERE provider_payment_id = $2 AND status != 'refund_failed' RETURNING booking_id",
          [refundId, paymentId]
        );
        if (updateRes.rows.length > 0) {
          await client.query("UPDATE bookings SET payment_status = 'REFUND_FAILED', updated_at = NOW() WHERE id = $1", [updateRes.rows[0].booking_id]);
        }
      }
    }

    await client.query('COMMIT');
    return res.status(200).send('OK');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Webhook error:', err);
    return res.status(500).send('Webhook Processing Failed');
  } finally {
    client.release();
  }
});
