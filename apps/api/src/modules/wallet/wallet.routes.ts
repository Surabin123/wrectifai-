import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/database';

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

// POST /wallet/add-funds (Dummy endpoint for testing)
walletRouter.post('/add-funds', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return error(res, 'User ID is required', 'UNAUTHORIZED', 401);
    }

    const { amount, method } = req.body;
    if (!amount || amount <= 0) {
      return error(res, 'Valid amount is required', 'BAD_REQUEST', 400);
    }

    // Begin transaction
    await query('BEGIN');

    // Get current wallet
    const walletRes = await query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
    let walletId, balanceBefore;
    
    if (walletRes.rows.length === 0) {
      // Create wallet if it doesn't exist
      const newWallet = await query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id', [userId]);
      walletId = newWallet.rows[0].id;
      balanceBefore = 0;
    } else {
      walletId = walletRes.rows[0].id;
      balanceBefore = Number(walletRes.rows[0].balance);
    }

    const balanceAfter = balanceBefore + Number(amount);

    // Update wallet balance
    await query('UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2', [balanceAfter, walletId]);

    // Insert transaction
    await query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, reference_type, status, description)
       VALUES ($1, 'CREDIT', $2, $3, $4, 'Wallet', 'COMPLETED', $5)`,
      [walletId, amount, balanceBefore, balanceAfter, method || 'Added Money']
    );

    await query('COMMIT');

    return success(res, { balance: balanceAfter }, 200);
  } catch (err) {
    await query('ROLLBACK');
    return error(
      res,
      err instanceof Error ? err.message : 'Failed to add funds',
      'INTERNAL_SERVER_ERROR',
      500
    );
  }
});
