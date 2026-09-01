import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { getDbPool } from '../../config/database';
import { createRazorpayOrder, verifyWebhookSignature } from './razorpay.service';
import { getEnv } from '../../config/env';

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

// POST /api/v1/payments/verify - Verify Razorpay payment signature
paymentsRouter.post('/verify', authenticate, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return error(res, 'Missing payment verification details', 'BAD_REQUEST', 400);
  }

  try {
    const crypto = require('crypto');
    const secret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';
    
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return error(res, 'Payment signature verification failed', 'BAD_REQUEST', 400);
    }

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
        return success(res, { verified: true }, 200);
      }
      
      const booking = bookingRes.rows[0];
      
      // Idempotency: if already paid, just return true
      if (booking.payment_status === 'PAID') {
        await client.query('ROLLBACK');
        return success(res, { verified: true }, 200);
      }
      
      // 1. Update Booking Payment Status
      await client.query(
        'UPDATE bookings SET payment_status = $1 WHERE id = $2',
        ['PAID', booking.id]
      );
      
      const paymentAmount = Number(booking.total_amount || 0) - Number(booking.discount_applied || 0) - Number(booking.wallet_used || 0);
      
      // 2. Insert into Payments (if not exists)
      const paymentCheck = await client.query('SELECT id FROM payments WHERE provider_intent_id = $1', [razorpay_payment_id]);
      if (paymentCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO payments (payer_user_id, booking_id, provider, provider_intent_id, amount, status)
           VALUES ($1, $2, 'razorpay', $3, $4, 'succeeded')`,
          [booking.customer_id, booking.id, razorpay_payment_id, paymentAmount]
        );
      }
      
      // 3. Complete Wallet Hold (if any)
      await client.query(
        'UPDATE wallet_transactions SET status = $1 WHERE reference_id = $2 AND status = $3',
        ['COMPLETED', booking.id, 'PENDING']
      );
      
      
      await client.query('COMMIT');
      return success(res, { verified: true }, 200);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Verify error:', err);
    return error(res, 'Failed to verify payment', 'INTERNAL_SERVER_ERROR', 500);
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

          const paymentCheck = await client.query('SELECT id FROM payments WHERE provider_intent_id = $1', [paymentEntity.id]);
          if (paymentCheck.rows.length === 0) {
            await client.query(
              `INSERT INTO payments (payer_user_id, booking_id, provider, provider_intent_id, amount, status)
               VALUES ($1, $2, 'razorpay', $3, $4, 'succeeded')`,
              [booking.customer_id, booking.id, paymentEntity.id, amount]
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
          // If we track failed payments, we'd insert one, but since we only insert on success currently, we can skip or insert failed.
          // For now, just rely on booking status.
          const failedPaymentCheck = await client.query('SELECT id FROM payments WHERE provider_intent_id = $1', [paymentEntity.id]);
          if (failedPaymentCheck.rows.length === 0) {
            await client.query(
              `INSERT INTO payments (payer_user_id, booking_id, provider, provider_intent_id, amount, status)
               VALUES ($1, $2, 'razorpay', $3, $4, 'failed')`,
              [booking.customer_id, booking.id, paymentEntity.id, paymentEntity.amount / 100]
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
          "UPDATE payments SET status = 'refunded', provider_refund_id = $1, updated_at = NOW() WHERE provider_payment_id = $2 AND status != 'refunded' RETURNING booking_id",
          [refundId, paymentId]
        );
        if (updateRes.rows.length > 0) {
          await client.query("UPDATE bookings SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1", [updateRes.rows[0].booking_id]);
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
          await client.query("UPDATE bookings SET payment_status = 'refund_failed', updated_at = NOW() WHERE id = $1", [updateRes.rows[0].booking_id]);
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
