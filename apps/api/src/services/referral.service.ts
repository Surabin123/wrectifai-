import { getDbPool } from '../config/database';

export class ReferralService {
  /**
   * Processes a referral reward when a referee completes their first booking.
   * Ensures idempotency: a referee can only trigger one reward.
   */
  static async processReferralReward(refereeId: string, bookingId: string): Promise<void> {
    const client = await getDbPool().connect();
    
    try {
      await client.query('BEGIN');

      // 1. Get the referee and check if they were referred by someone
      const refereeRes = await client.query(
        'SELECT referred_by, country, preferred_currency FROM users WHERE id = $1',
        [refereeId]
      );

      if (refereeRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return;
      }

      const referee = refereeRes.rows[0];
      const referrerId = referee.referred_by;

      if (!referrerId) {
        // Not a referred user
        await client.query('ROLLBACK');
        return;
      }

      // Prevent self-referral (sanity check)
      if (referrerId === refereeId) {
        await client.query('ROLLBACK');
        return;
      }

      // 2. Check for idempotency: Has this referee already generated a reward?
      const existingRewardRes = await client.query(
        'SELECT id FROM referral_rewards WHERE referee_id = $1 AND status = $2',
        [refereeId, 'completed']
      );

      if (existingRewardRes.rows.length > 0) {
        // Reward already given for this referee
        await client.query('ROLLBACK');
        return;
      }

      // 3. Determine the reward amount based on the referrer's currency (or referee's)
      const referrerRes = await client.query(
        'SELECT preferred_currency FROM users WHERE id = $1',
        [referrerId]
      );
      
      const currency = (referrerRes.rows.length > 0 ? referrerRes.rows[0].preferred_currency : 'INR') || 'INR';
      let rewardAmount = 0;

      // Define standard reward tiers based on currency
      switch (currency.toUpperCase()) {
        case 'INR':
          rewardAmount = 500;
          break;
        case 'USD':
          rewardAmount = 20;
          break;
        case 'AED':
          rewardAmount = 50;
          break;
        default:
          // Fallback or unsupported currency mapping
          rewardAmount = 500; // If they use a custom unsupported one, fallback to 500 units
          break;
      }

      if (rewardAmount <= 0) {
        await client.query('ROLLBACK');
        return;
      }

      // 4. Create the referral reward record
      const rewardRes = await client.query(
        `INSERT INTO referral_rewards (referrer_id, referee_id, amount, status) 
         VALUES ($1, $2, $3, 'completed') RETURNING id`,
        [referrerId, refereeId, rewardAmount]
      );
      const rewardId = rewardRes.rows[0].id;

      // 5. Add to wallet securely
      // First ensure the referrer has a wallet
      await client.query(
        `INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING`,
        [referrerId]
      );

      // Get current balance and lock row for update
      const walletRes = await client.query(
        'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [referrerId]
      );
      
      const walletId = walletRes.rows[0].id;
      const balanceBefore = parseFloat(walletRes.rows[0].balance);
      const balanceAfter = balanceBefore + rewardAmount;

      // Update wallet balance
      await client.query(
        'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
        [balanceAfter, walletId]
      );

      // Record wallet transaction
      await client.query(
        `INSERT INTO wallet_transactions 
         (wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, status, description)
         VALUES ($1, 'REWARD', $2, $3, $4, 'REFERRAL', $5, 'COMPLETED', $6)`,
        [
          walletId, 
          rewardAmount, 
          balanceBefore, 
          balanceAfter, 
          rewardId, 
          `Referral bonus for a completed booking`
        ]
      );

      await client.query('COMMIT');
      console.log(`[ReferralService] Successfully processed referral reward for referrer ${referrerId} (Amount: ${rewardAmount} ${currency})`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ReferralService] Error processing referral reward:', error);
    } finally {
      client.release();
    }
  }
}
