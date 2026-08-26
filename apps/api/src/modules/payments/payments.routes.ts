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
      if (booking.payment_status === 'paid' || booking.status === 'confirmed') {
        await client.query('ROLLBACK');
        return success(res, { verified: true }, 200);
      }
      
      // 1. Update Booking
      await client.query(
        'UPDATE bookings SET status = $1, payment_status = $2 WHERE id = $3',
        ['confirmed', 'paid', booking.id]
      );
      
      const paymentAmount = Number(booking.total_amount || 0) - Number(booking.discount_applied || 0) - Number(booking.wallet_used || 0);
      
      // 2. Insert into Payments (if not exists)
      const paymentCheck = await client.query('SELECT id FROM payments WHERE provider_intent_id = $1', [razorpay_order_id]);
      if (paymentCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO payments (payer_user_id, booking_id, provider, provider_intent_id, provider_payment_id, amount, status)
           VALUES ($1, $2, 'razorpay', $3, $4, $5, 'succeeded')`,
          [booking.customer_id, booking.id, razorpay_order_id, razorpay_payment_id, paymentAmount]
        );
      } else {
        await client.query(
          `UPDATE payments SET provider_payment_id = $1, status = 'succeeded' WHERE provider_intent_id = $2`,
          [razorpay_payment_id, razorpay_order_id]
        );
      }
      
      // 3. Complete Wallet Hold (if any)
      await client.query(
        'UPDATE wallet_transactions SET status = $1 WHERE reference_id = $2 AND status = $3',
        ['COMPLETED', booking.id, 'PENDING']
      );
      
      // 4. Insert Razorpay payment into Wallet Transactions so it shows in history
      let walletId;
      const walletRes = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [booking.customer_id]);
      if (walletRes.rows.length > 0) {
        walletId = walletRes.rows[0].id;
      } else {
        const newWalletRes = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id', [booking.customer_id]);
        walletId = newWalletRes.rows[0].id;
      }
      
      const txCheck = await client.query(
        "SELECT id FROM wallet_transactions WHERE wallet_id = $1 AND reference_id = $2 AND description LIKE '%Razorpay%'", 
        [walletId, booking.id]
      );
      
      if (txCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO wallet_transactions 
           (wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, status, description)
           VALUES ($1, 'DEBIT', $2, 
           (SELECT balance FROM wallets WHERE id = $1), 
           (SELECT balance FROM wallets WHERE id = $1), 
           'BOOKING', $3, 'COMPLETED', 'Payment for Booking (Razorpay)')`,
          [walletId, paymentAmount, booking.id]
        );
      }
      
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
        
        if (booking.payment_status === 'paid' || booking.status === 'confirmed') {
          // Already paid, ignore safely
        } else {
          // Update booking status
          await client.query(
            'UPDATE bookings SET status = $1, payment_status = $2 WHERE id = $3',
            ['confirmed', 'paid', booking.id]
          );

          const paymentCheck = await client.query('SELECT id FROM payments WHERE provider_intent_id = $1', [providerIntentId]);
          if (paymentCheck.rows.length === 0) {
            await client.query(
              `INSERT INTO payments (payer_user_id, booking_id, provider, provider_intent_id, provider_payment_id, amount, status)
               VALUES ($1, $2, 'razorpay', $3, $4, $5, 'succeeded')`,
              [booking.customer_id, booking.id, providerIntentId, paymentEntity.id, amount]
            );
          } else {
            await client.query(
              'UPDATE payments SET provider_payment_id = $1, status = $2 WHERE provider_intent_id = $3',
              [paymentEntity.id, 'succeeded', providerIntentId]
            );
          }

          // Commit wallet transaction
          await client.query(
            'UPDATE wallet_transactions SET status = $1 WHERE reference_id = $2 AND status = $3',
            ['COMPLETED', booking.id, 'PENDING']
          );
          
          let walletId;
          const walletRes = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [booking.customer_id]);
          if (walletRes.rows.length > 0) {
            walletId = walletRes.rows[0].id;
          } else {
            const newWalletRes = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id', [booking.customer_id]);
            walletId = newWalletRes.rows[0].id;
          }
          
          const txCheck = await client.query(
            "SELECT id FROM wallet_transactions WHERE wallet_id = $1 AND reference_id = $2 AND description LIKE '%Razorpay%'", 
            [walletId, booking.id]
          );
          if (txCheck.rows.length === 0) {
            await client.query(
              `INSERT INTO wallet_transactions 
               (wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, status, description)
               VALUES ($1, 'DEBIT', $2, 
               (SELECT balance FROM wallets WHERE id = $1), 
               (SELECT balance FROM wallets WHERE id = $1), 
               'BOOKING', $3, 'COMPLETED', 'Payment for Booking (Razorpay)')`,
              [walletId, amount, booking.id]
            );
          }
        }
      }
    } else if (webhookBody.event === 'payment.failed') {
      const providerIntentId = paymentEntity.order_id || paymentEntity.id;

      const bookingRes = await client.query('SELECT id, customer_id, payment_status, status FROM bookings WHERE payment_intent_id = $1', [providerIntentId]);
      
      if (bookingRes.rows.length > 0) {
        const booking = bookingRes.rows[0];
        
        if (booking.payment_status === 'failed' || booking.status === 'cancelled') {
           // Already handled
        } else {
          await client.query(
            'UPDATE payments SET status = $1 WHERE provider_intent_id = $2',
            ['failed', providerIntentId]
          );

          await client.query(
            'UPDATE bookings SET status = $1, payment_status = $2 WHERE id = $3',
            ['cancelled', 'failed', booking.id]
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
