import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
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
  if (!amount) {
    return error(res, 'Amount is required to create a payment order', 'BAD_REQUEST', 400);
  }

  try {
    // Amount should be in paise for Razorpay
    const amountInPaise = Math.round(Number(amount) * 100);
    const receiptId = bookingId ? bookingId.substring(0, 40) : `rcpt_${Date.now()}`;
    
    const order = await createRazorpayOrder(amountInPaise, receiptId, {
      userId: req.user?.userId,
      bookingId
    });

    if (bookingId) {
      const pool = getDbPool();
      await pool.query('UPDATE bookings SET payment_intent_id = $1 WHERE id = $2', [order.id, bookingId]);
    }

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
    console.error('Signature mismatch in /verify', {
      expected: generated_signature,
      received: razorpay_signature,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    });
    return error(res, 'Payment signature verification failed', 'BAD_REQUEST', 400);
  }

  // Step 2: Update database — signature is authoritative proof of Razorpay success
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bookingRes = await client.query(
      'SELECT id, customer_id, total_amount, discount_applied, wallet_used, payment_status, status FROM bookings WHERE payment_intent_id = $1 FOR UPDATE', 
      [razorpay_order_id]
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
      'SELECT id FROM payments WHERE provider_order_id = $1 AND (provider_payment_id = $2 OR transaction_id = $2)',
      [razorpay_order_id, razorpay_payment_id]
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

  const pool = getDbPool();
  try {
    const bookingRes = await pool.query(
      'SELECT id, customer_id, total_amount, discount_applied, wallet_used FROM bookings WHERE payment_intent_id = $1',
      [razorpay_order_id]
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
paymentsRouter.post('/booking/:id/refund', authenticate, async (req, res) => {
  const bookingId = req.params.id;
  const { reason } = req.body;
  if (!reason || reason.trim() === '') {
    return error(res, 'Refund reason is required', 'BAD_REQUEST', 400);
  }

  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const paymentRes = await client.query(
      'SELECT * FROM payments WHERE booking_id = $1 AND status IN (\'paid\', \'succeeded\') FOR UPDATE',
      [bookingId]
    );

    if (paymentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return error(res, 'Payment not found, already refunded, or not in a refundable state', 'BAD_REQUEST', 400);
    }

    const payment = paymentRes.rows[0];

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
      await client.query('ROLLBACK');
      const errorMessage = rzpErr?.error?.description || rzpErr?.message || (typeof rzpErr === 'string' ? rzpErr : JSON.stringify(rzpErr)) || 'Unknown Razorpay Error';
      return error(res, 'Razorpay refund API failed: ' + errorMessage, 'BAD_REQUEST', 400);
    }

    const paymentRefundStatus = refund.status === 'processed' ? 'refunded' : 'refund_pending';
    const bookingRefundStatus = refund.status === 'processed' ? 'REFUNDED' : 'REFUND_PENDING';
    
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
  const secret = env.jwtSecret; // Or RAZORPAY_WEBHOOK_SECRET

  const isValid = verifyWebhookSignature(rawBody, signature, secret);
  if (!isValid) {
    return res.status(400).send('Invalid signature');
  }

  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Idempotency Check
    const checkRes = await client.query('SELECT 1 FROM webhook_events WHERE event_id = $1', [eventId]);
    if (checkRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(200).send('OK');
    }

    // Insert idempotency key
    await client.query('INSERT INTO webhook_events (event_id, event_type, payload) VALUES ($1, $2, $3)', [
      eventId,
      webhookBody.event,
      webhookBody
    ]);

    const paymentEntity = webhookBody.payload?.payment?.entity;
    
    if (webhookBody.event === 'payment.captured' || webhookBody.event === 'order.paid') {
      const providerIntentId = paymentEntity.order_id || paymentEntity.id;
      const amount = paymentEntity.amount / 100;

      const bookingRes = await client.query(
        'SELECT id, customer_id, payment_status, status FROM bookings WHERE payment_intent_id = $1 FOR UPDATE', 
        [providerIntentId]
      );
      
      if (bookingRes.rows.length > 0) {
        const booking = bookingRes.rows[0];
        
        if (booking.payment_status === 'PAID') {
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
              `INSERT INTO payments (customer_user_id, booking_id, provider, provider_intent_id, provider_order_id, provider_payment_id, amount, status)
               VALUES ($1, $2, 'razorpay', $3, $4, $5, $6, 'succeeded')
               ON CONFLICT (provider_intent_id) DO NOTHING`,
              [booking.customer_id, booking.id, paymentEntity.id, providerIntentId, paymentEntity.id, amount]
            );
          }

          // Commit wallet transaction
          await client.query(
            'UPDATE wallet_transactions SET status = $1 WHERE reference_id = $2 AND status = $3',
            ['COMPLETED', booking.id, 'PENDING']
          );
        }
      }
    } else if (webhookBody.event === 'payment.failed') {
      const providerIntentId = paymentEntity.order_id || paymentEntity.id;

      const bookingRes = await client.query('SELECT id, customer_id, payment_status, status FROM bookings WHERE payment_intent_id = $1', [providerIntentId]);
      
      if (bookingRes.rows.length > 0) {
        const booking = bookingRes.rows[0];
        
        if (booking.payment_status === 'FAILED' || booking.status === 'cancelled') {
           // Already handled
        } else {
          const failedPaymentCheck = await client.query(
            'SELECT id FROM payments WHERE provider_payment_id = $1 OR provider_intent_id = $1',
            [paymentEntity.id]
          );
          if (failedPaymentCheck.rows.length === 0) {
            await client.query(
              `INSERT INTO payments (customer_user_id, booking_id, provider, provider_intent_id, provider_order_id, provider_payment_id, amount, status)
               VALUES ($1, $2, 'razorpay', $3, $4, $5, $6, 'failed')
               ON CONFLICT (provider_intent_id) DO NOTHING`,
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
            ['RELEASED', booking.id, 'PENDING']
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
