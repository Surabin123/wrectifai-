import { Router } from 'express';
import { query } from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { success, error } from '../../utils/response';

import crypto from 'crypto';

export const referralsRouter = Router();

function normalizeRegion(country?: string, currency?: string): string {
  const c = (country || '').toUpperCase();
  const curr = (currency || '').toUpperCase();
  if (c === 'UAE' || c === 'AE' || c.includes('EMIRATES') || curr === 'AED') return 'UAE';
  if (c === 'USA' || c === 'US' || c.includes('STATES') || curr === 'USD') return 'USA';
  return 'India';
}

// GET /api/v1/referrals/stats
referralsRouter.get('/stats', authenticate, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);
  }

  try {
    // Get user's referral code
    const userRes = await query('SELECT referral_code, preferred_currency, country FROM users WHERE id = $1', [userId]);
    let user = userRes.rows[0];

    // Auto-generate referral code if it's missing (e.g. users from OAuth or old records)
    if (!user.referral_code) {
      const newRefCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      await query('UPDATE users SET referral_code = $1 WHERE id = $2', [newRefCode, userId]);
      user.referral_code = newRefCode;
    }

    // Determine region and defaults
    const region = normalizeRegion(user.country, user.preferred_currency);
    let isEnabled = true;
    let earningPotential = region === 'UAE' ? 50 : region === 'USA' ? 20 : 500;
    let currency = region === 'UAE' ? 'AED' : region === 'USA' ? 'USD' : 'INR';

    try {
      const configRes = await query(
        'SELECT is_enabled, reward_amount, currency FROM referral_configs WHERE region = $1',
        [region]
      );

      if (configRes.rows.length > 0) {
        isEnabled = configRes.rows[0].is_enabled;
        earningPotential = parseFloat(configRes.rows[0].reward_amount);
        currency = configRes.rows[0].currency;
      }
    } catch (dbErr) {
      console.warn('[Referrals] Config fetch fallback:', dbErr);
    }

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
      earningPotential: earningPotential,
      isEnabled: isEnabled
    });
  } catch (err) {
    console.error('Error fetching referral stats:', err);
    return error(res, 'Internal server error', 'INTERNAL_SERVER_ERROR', 500);
  }
});
