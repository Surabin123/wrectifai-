import { getDbPool } from '../../config/database';

/**
 * Creates a HOLD on the user's wallet for a specified amount.
 * Throws an error if insufficient funds.
 */
export async function holdWalletBalance(userId: string, amount: number, referenceType: string, referenceId: string) {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Lock the wallet row to prevent concurrent updates
    const walletRes = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (walletRes.rows.length === 0) {
      throw new Error('Wallet not found for this user.');
    }

    const wallet = walletRes.rows[0];
    const currentBalance = Number(wallet.balance);

    if (currentBalance < amount) {
      throw new Error(`Insufficient wallet balance. Available: ${currentBalance}`);
    }

    const newBalance = currentBalance - amount;

    // 2. Deduct the balance (as a HOLD, physically removed from 'available' balance)
    await client.query(
      'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, wallet.id]
    );

    // 3. Create the HOLD transaction record
    const txRes = await client.query(
      `INSERT INTO wallet_transactions 
       (wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, status, description)
       VALUES ($1, 'HOLD', $2, $3, $4, $5, $6, 'PENDING', 'Wallet amount held for checkout')
       RETURNING id`,
      [wallet.id, amount, currentBalance, newBalance, referenceType, referenceId]
    );

    await client.query('COMMIT');
    return txRes.rows[0].id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Commits a HOLD, finalizing the deduction (marking it COMPLETED).
 * Usually called upon successful payment verification.
 */
export async function commitWalletHold(transactionId: string) {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const txRes = await client.query(
      'SELECT * FROM wallet_transactions WHERE id = $1 FOR UPDATE',
      [transactionId]
    );

    if (txRes.rows.length === 0) {
      throw new Error('Transaction not found.');
    }

    const tx = txRes.rows[0];
    if (tx.status !== 'PENDING' || tx.type !== 'HOLD') {
      throw new Error('Transaction is not in a valid state to be committed.');
    }

    await client.query(
      `UPDATE wallet_transactions SET status = 'COMPLETED' WHERE id = $1`,
      [transactionId]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Releases a HOLD, refunding the amount back to the user's available balance.
 * Usually called upon payment failure or cancellation.
 */
export async function releaseWalletHold(transactionId: string) {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock transaction
    const txRes = await client.query(
      'SELECT * FROM wallet_transactions WHERE id = $1 FOR UPDATE',
      [transactionId]
    );

    if (txRes.rows.length === 0) {
      throw new Error('Transaction not found.');
    }

    const tx = txRes.rows[0];
    if (tx.status !== 'PENDING' || tx.type !== 'HOLD') {
      throw new Error('Transaction is not in a valid state to be released.');
    }

    // Lock wallet
    const walletRes = await client.query(
      'SELECT id, balance FROM wallets WHERE id = $1 FOR UPDATE',
      [tx.wallet_id]
    );
    
    const currentBalance = Number(walletRes.rows[0].balance);
    const amount = Number(tx.amount);
    const newBalance = currentBalance + amount;

    // Refund wallet
    await client.query(
      'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, tx.wallet_id]
    );

    // Update original transaction to FAILED (since it didn't complete)
    await client.query(
      `UPDATE wallet_transactions SET status = 'FAILED' WHERE id = $1`,
      [transactionId]
    );

    // Create a RELEASE transaction for the audit log
    await client.query(
      `INSERT INTO wallet_transactions 
       (wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, status, description)
       VALUES ($1, 'RELEASE', $2, $3, $4, $5, $6, 'COMPLETED', 'Wallet hold released due to checkout failure')`,
      [tx.wallet_id, amount, currentBalance, newBalance, tx.reference_type, tx.reference_id]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
