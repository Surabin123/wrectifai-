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

    const walletRes = await query(
      'SELECT id, balance FROM wallets WHERE user_id = $1',
      [userId]
    );

    let balance = 0;
    let main = 0;
    let bonus = 0;
    let pendingRefunds = 0;

    if (walletRes.rows.length > 0) {
      balance = Number(walletRes.rows[0].balance);
      const walletId = walletRes.rows[0].id;

      // Bonus = Total REWARD credits ever given (simplification if we don't track bonus vs main debit)
      // Actually, a better way: sum(amount) for REWARD
      const txRes = await query(
        `SELECT type, amount FROM wallet_transactions WHERE wallet_id = $1`,
        [walletId]
      );
      
      let totalRewards = 0;
      txRes.rows.forEach((r: any) => {
        if (r.type === 'REWARD') totalRewards += Number(r.amount);
      });
      
      bonus = Math.min(totalRewards, balance); // Bonus can't exceed current balance
      main = balance - bonus;
    }

    // Pending Refunds = payments with status 'refund_pending'
    const pendingRes = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_pending FROM payments WHERE payer_user_id = $1 AND status = 'refund_pending'`,
      [userId]
    );
    pendingRefunds = Number(pendingRes.rows[0].total_pending);

    return success(res, { balance, main, bonus, pendingRefunds }, 200);
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

    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!secret) {
      console.error('RAZORPAY_KEY_SECRET is not defined in backend');
      return error(res, 'Razorpay secret not configured', 'INTERNAL_SERVER_ERROR', 500);
    }
    
    const crypto = require('crypto');
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      console.error('Signature mismatch', {
        expected: generated_signature,
        received: razorpay_signature,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      });
      return error(res, 'Payment signature verification failed', 'BAD_REQUEST', 400);
    }

    const result = await withTransaction(async (client) => {
      // Idempotency check: has this Razorpay order already been credited?
      // Use payments.transaction_id (VARCHAR, UNIQUE) — the actual live column name.
      const idempCheck = await client.query(
        "SELECT id FROM payments WHERE transaction_id = $1 AND status = 'succeeded'",
        [razorpay_order_id]
      );
      if (idempCheck.rows.length > 0) {
        // Already processed — return existing wallet balance
        const walletRes = await client.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
        return walletRes.rows[0] ? Number(walletRes.rows[0].balance) : 0;
      }

      // Ensure wallet exists
      await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING', [userId]);

      // Lock wallet row for atomic update
      const walletRes = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
      const walletId = walletRes.rows[0].id;
      const balanceBefore = Number(walletRes.rows[0].balance);
      const balanceAfter = balanceBefore + Number(amount);

      // Credit wallet
      await client.query('UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2', [balanceAfter, walletId]);

      // Insert wallet transaction.
      // reference_id in migration 020 is TEXT — safe to store Razorpay pay_... IDs.
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, status, description)
         VALUES ($1, 'CREDIT', $2, $3, $4, 'TOPUP', $5, 'COMPLETED', 'Wallet Top-up via Razorpay')`,
        [walletId, amount, balanceBefore, balanceAfter, razorpay_payment_id]
      );

      // Insert payments ledger record using the ACTUAL live DB column names:
      //   customer_user_id  = internal UUID  (NOT a Razorpay ID)
      //   transaction_id    = razorpay_order_id (VARCHAR UNIQUE — idempotency key)
      //   method            = 'razorpay' (VARCHAR)
      //   provider_order_id = razorpay_order_id (added by migration 020)
      //   provider_payment_id = razorpay_payment_id (added by migration 020)
      //   signature_status  = 'valid' (added by migration 020)
      await client.query(
        `INSERT INTO payments (customer_user_id, method, transaction_id, provider_order_id, provider_payment_id, amount, currency, status, signature_status)
         VALUES ($1, 'razorpay', $2, $3, $4, $5, 'INR', 'succeeded', 'valid')
         ON CONFLICT (transaction_id) DO NOTHING`,
        [userId, razorpay_order_id, razorpay_order_id, razorpay_payment_id, amount]
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

// GET /wallet/saved-methods
walletRouter.get('/saved-methods', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return error(res, 'User ID is required', 'UNAUTHORIZED', 401);

    const result = await query(
      'SELECT id, token_id as "tokenId", card_network as "cardNetwork", card_last4 as "cardLast4", card_issuer as "cardIssuer", is_default as "isDefault", provider FROM saved_payment_methods WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return success(res, result.rows, 200);
  } catch (err) {
    return error(res, err instanceof Error ? err.message : 'Failed to retrieve saved methods', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// POST /wallet/saved-methods
walletRouter.post('/saved-methods', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return error(res, 'User ID is required', 'UNAUTHORIZED', 401);

    // In a real Razorpay TokenHQ integration, we would receive a razorpay_payment_id or token here
    // and fetch the card details from Razorpay SDK to save securely.
    // For now, we accept minimal card details strictly for database persistence per requirements.
    const { tokenId, cardNetwork, cardLast4, cardIssuer } = req.body;
    if (!tokenId || !cardLast4) {
       return error(res, 'Missing card details', 'BAD_REQUEST', 400);
    }

    // Check if this is the first card, make it default
    const existing = await query('SELECT id FROM saved_payment_methods WHERE user_id = $1', [userId]);
    const isDefault = existing.rows.length === 0;

    const result = await query(
      `INSERT INTO saved_payment_methods (user_id, token_id, card_network, card_last4, card_issuer, is_default)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, token_id as "tokenId", card_network as "cardNetwork", card_last4 as "cardLast4", is_default as "isDefault"`,
      [userId, tokenId, cardNetwork || 'Unknown', cardLast4, cardIssuer || 'Bank', isDefault]
    );

    return success(res, result.rows[0], 200);
  } catch (err) {
    return error(res, err instanceof Error ? err.message : 'Failed to save payment method', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// DELETE /wallet/saved-methods/:id
walletRouter.delete('/saved-methods/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return error(res, 'User ID is required', 'UNAUTHORIZED', 401);

    const { id } = req.params;

    // Remove from DB (in real flow, we would also call rzp.customers.deleteToken)
    await query('DELETE FROM saved_payment_methods WHERE id = $1 AND user_id = $2', [id, userId]);

    // If we deleted the default, set another one as default
    const checkDefault = await query('SELECT id FROM saved_payment_methods WHERE user_id = $1 AND is_default = true', [userId]);
    if (checkDefault.rows.length === 0) {
       await query(`UPDATE saved_payment_methods SET is_default = true WHERE id = (
           SELECT id FROM saved_payment_methods WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1
       )`, [userId]);
    }

    return success(res, { deleted: true }, 200);
  } catch (err) {
    return error(res, err instanceof Error ? err.message : 'Failed to delete payment method', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// PUT /wallet/saved-methods/:id/default
walletRouter.put('/saved-methods/:id/default', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return error(res, 'User ID is required', 'UNAUTHORIZED', 401);
    const { id } = req.params;

    await withTransaction(async (client) => {
       await client.query('UPDATE saved_payment_methods SET is_default = false WHERE user_id = $1', [userId]);
       await client.query('UPDATE saved_payment_methods SET is_default = true WHERE id = $1 AND user_id = $2', [id, userId]);
    });

    return success(res, { success: true }, 200);
  } catch (err) {
    return error(res, err instanceof Error ? err.message : 'Failed to set default method', 'INTERNAL_SERVER_ERROR', 500);
  }
});
