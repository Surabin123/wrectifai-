import { query, withTransaction } from '../../config/database';

export interface ReconciliationSummary {
  reconciledPaymentsCount: number;
  reconciledWalletTopupsCount: number;
  reconciledBookingsCount: number;
  timestamp: string;
}

export class PaymentReconciliationService {
  /**
   * Reconciles orphan or stuck payments, pending wallet top-ups, and out-of-order webhook states.
   */
  static async reconcile(): Promise<ReconciliationSummary> {
    let reconciledPayments = 0;
    let reconciledTopups = 0;
    let reconciledBookings = 0;

    await withTransaction(async (client) => {
      // 1. Detect succeeded payments where booking remains in PENDING payment status
      const stuckBookings = await client.query(`
        SELECT b.id as booking_id, p.provider_payment_id
        FROM bookings b
        JOIN payments p ON p.booking_id = b.id
        WHERE p.status = 'succeeded' AND b.payment_status != 'PAID'
        FOR UPDATE OF b
      `);

      for (const row of stuckBookings.rows) {
        await client.query(
          `UPDATE bookings SET payment_status = 'PAID', updated_at = NOW() WHERE id = $1`,
          [row.booking_id]
        );
        reconciledBookings++;
      }

      // 2. Detect completed wallet topup payments where transaction status is PENDING
      const pendingTopups = await client.query(`
        SELECT wt.id, wt.wallet_id, wt.amount, p.provider_payment_id
        FROM wallet_transactions wt
        JOIN payments p ON p.transaction_id = wt.reference_id OR p.provider_order_id = wt.reference_id
        WHERE wt.reference_type = 'WALLET_TOPUP' AND wt.status = 'PENDING' AND p.status = 'succeeded'
        FOR UPDATE OF wt
      `);

      for (const topup of pendingTopups.rows) {
        const walletRes = await client.query(
          'SELECT balance FROM wallets WHERE id = $1 FOR UPDATE',
          [topup.wallet_id]
        );
        if (walletRes.rows.length > 0) {
          const before = Number(walletRes.rows[0].balance);
          const after = before + Number(topup.amount);
          await client.query(
            'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
            [after, topup.wallet_id]
          );
          await client.query(
            `UPDATE wallet_transactions SET type='CREDIT', status='COMPLETED', reference_type='TOPUP', balance_before=$1, balance_after=$2 WHERE id=$3`,
            [before, after, topup.id]
          );
          reconciledTopups++;
        }
      }
    });

    return {
      reconciledPaymentsCount: reconciledPayments,
      reconciledWalletTopupsCount: reconciledTopups,
      reconciledBookingsCount: reconciledBookings,
      timestamp: new Date().toISOString(),
    };
  }
}
