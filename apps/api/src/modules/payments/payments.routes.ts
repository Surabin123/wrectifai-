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

    if (generated_signature === razorpay_signature) {
      return success(res, { verified: true }, 200);
    } else {
      return error(res, 'Payment signature verification failed', 'BAD_REQUEST', 400);
    }
  } catch (err) {
    return error(res, 'Failed to verify payment', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// POST /api/v1/payments/webhook - Server-side Razorpay Webhook Endpoint
// Note: Requires raw body. Make sure express handles raw body if needed, 
// but for standard json middleware we can stringify if order of keys doesn't break, 
// though standard practice requires `express.raw({type: 'application/json'})`.
// For serverless/Vercel, req.body is usually parsed, but we assume raw body is available via middleware.
paymentsRouter.post('/webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const eventId = req.headers['x-razorpay-event-id'] as string;
  
  if (!signature || !eventId) {
    return res.status(400).send('Missing headers');
  }

  // If using generic body-parser json, verifyWebhookSignature usually needs the raw body buffer.
  // We'll use JSON.stringify(req.body) here as a fallback if raw body isn't explicitly configured.
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
      // Already processed safely acknowledge
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

      // Ensure booking and wallet are committed
      const bookingRes = await client.query('SELECT id, user_id FROM bookings WHERE payment_intent_id = $1', [providerIntentId]);
      
      if (bookingRes.rows.length > 0) {
        const booking = bookingRes.rows[0];
        
        // Update payment status
        await client.query(
          'UPDATE payments SET status = $1 WHERE provider_intent_id = $2',
          ['succeeded', providerIntentId]
        );

        // Update booking status
        await client.query(
          'UPDATE bookings SET status = $1, payment_status = $2 WHERE id = $3',
          ['confirmed', 'paid', booking.id]
        );

        // Commit wallet transaction
        await client.query(
          'UPDATE wallet_transactions SET status = $1 WHERE booking_id = $2 AND status = $3',
          ['COMPLETED', booking.id, 'HELD']
        );
      }
    } else if (webhookBody.event === 'payment.failed') {
      const providerIntentId = paymentEntity.order_id || paymentEntity.id;

      const bookingRes = await client.query('SELECT id FROM bookings WHERE payment_intent_id = $1', [providerIntentId]);
      
      if (bookingRes.rows.length > 0) {
        const bookingId = bookingRes.rows[0].id;
        
        // Update payment status
        await client.query(
          'UPDATE payments SET status = $1 WHERE provider_intent_id = $2',
          ['failed', providerIntentId]
        );

        // Update booking status
        await client.query(
          'UPDATE bookings SET status = $1, payment_status = $2 WHERE id = $3',
          ['cancelled', 'failed', bookingId]
        );

        // Release wallet hold
        const txRes = await client.query(
          'UPDATE wallet_transactions SET status = $1 WHERE booking_id = $2 AND status = $3 RETURNING amount, wallet_id',
          ['RELEASED', bookingId, 'HELD']
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
