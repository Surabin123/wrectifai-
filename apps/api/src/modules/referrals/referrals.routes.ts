import { Router } from 'express';
import { query } from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { success, error } from '../../utils/response';

export const referralsRouter = Router();

// GET /api/v1/referrals/stats
referralsRouter.get('/stats', authenticate, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);
  }

  try {
    // Get user's referral code
    const userRes = await query('SELECT referral_code, preferred_currency, country FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    // Determine earning potential based on currency
    const currency = user.preferred_currency || 'INR';
    let earningPotential = 500;
    if (currency === 'USD') earningPotential = 20;
    if (currency === 'AED') earningPotential = 50;

    // Get stats
    const statsRes = await query(
      `SELECT 
         COUNT(*) as total_referrals,
         COALESCE(SUM(amount), 0) as total_earned
       FROM referral_rewards 
       WHERE referrer_id = $1 AND status = 'completed'`,
      [userId]
    );

    const stats = statsRes.rows[0];

    return success(res, {
      referralCode: user.referral_code,
      totalReferrals: parseInt(stats.total_referrals, 10),
      totalEarned: parseFloat(stats.total_earned),
      currency: currency,
      earningPotential: earningPotential
    });
  } catch (err) {
    console.error('Error fetching referral stats:', err);
    return error(res, 'Internal server error', 'INTERNAL_SERVER_ERROR', 500);
  }
});
