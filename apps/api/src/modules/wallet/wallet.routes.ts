import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query, withTransaction } from '../../config/database';

export const walletRouter = Router();

// GET /wallet/balance
walletRouter.get('/balance', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return error(res, 'User ID is required', 'UNAUTHORIZED', 401);
    }

    const result = await query(
      'SELECT balance FROM wallets WHERE user_id = $1',
      [userId]
    );

    const balance = result.rows.length > 0 ? Number(result.rows[0].balance) : 0;
    return success(res, { balance }, 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to retrieve wallet balance',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

// GET /wallet/transactions
walletRouter.get('/transactions', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return error(res, 'User ID is required', 'UNAUTHORIZED', 401);
    }

    const result = await query(
      `SELECT t.id, t.wallet_id, t.type, t.amount, t.balance_before, t.balance_after, t.reference_type as "referenceType", t.reference_id, t.status, t.description, t.created_at as "createdAt"
       FROM wallet_transactions t
       JOIN wallets w ON t.wallet_id = w.id
       WHERE w.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    return success(res, result.rows, 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to retrieve wallet transactions',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

// POST /wallet/add-funds - Generate Razorpay Order for Wallet Top-up
walletRouter.post('/add-funds', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return error(res, 'User ID is required', 'UNAUTHORIZED', 401);
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return error(res, 'Valid amount is required', 'BAD_REQUEST', 400);
    }

    const amountInPaise = Math.round(Number(amount) * 100);
    const { createRazorpayOrder } = require('../payments/razorpay.service');
    const order = await createRazorpayOrder(amountInPaise, `wallet_topup_${Date.now()}`, {
      userId,
      type: 'wallet_topup'
    });

    return success(res, { 
      razorpayOrderId: order.id,
      amount: amountInPaise,
      currency: 'INR'
    }, 200);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to generate top-up order',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});

// POST /wallet/verify-topup - Verify Razorpay payment and credit wallet
walletRouter.post('/verify-topup', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return error(res, 'User ID is required', 'UNAUTHORIZED', 401);
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return error(res, 'Missing payment verification details', 'BAD_REQUEST', 400);
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const crypto = require('crypto');
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return error(res, 'Payment signature verification failed', 'BAD_REQUEST', 400);
    }

    const result = await withTransaction(async (client) => {
      // Idempotency check: see if this payment_id already resulted in a wallet top-up
      const idempCheck = await client.query('SELECT id FROM wallet_transactions WHERE reference_id = $1', [razorpay_payment_id]);
      if (idempCheck.rows.length > 0) {
        // Already processed
        return;
      }

      // Ensure wallet exists first
      await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING', [userId]);

      // Get current wallet with a lock
      const walletRes = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
      
      const walletId = walletRes.rows[0].id;
      const balanceBefore = Number(walletRes.rows[0].balance);
      const balanceAfter = balanceBefore + Number(amount);

      // Update wallet balance
      await client.query('UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2', [balanceAfter, walletId]);

      // Insert transaction
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, status, description)
         VALUES ($1, 'CREDIT', $2, $3, $4, 'Wallet', $5, 'COMPLETED', 'Wallet Top-up')`,
        [walletId, amount, balanceBefore, balanceAfter, razorpay_payment_id]
      );

      // Record in payments ledger too for source of truth
      await client.query(
        `INSERT INTO payments (customer_user_id, method, transaction_id, provider_order_id, provider_payment_id, amount, status, signature_status)
         VALUES ($1, 'razorpay', $2, $3, $4, $5, 'succeeded', 'valid')
         ON CONFLICT (transaction_id) DO NOTHING`,
        [userId, razorpay_payment_id, razorpay_order_id, razorpay_payment_id, amount]
      );

      return balanceAfter;
    });

    return success(res, { verified: true, balance: result }, 200);
  } catch (err) {
    console.error('Verify topup error:', err);
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to verify top-up',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});
