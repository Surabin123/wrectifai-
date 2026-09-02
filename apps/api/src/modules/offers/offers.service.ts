import { getDbPool } from '../../config/database';

export async function validateOffer(code: string, userId: string, subtotal: number, garageId?: string) {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    const res = await client.query(
      `SELECT * FROM offers 
       WHERE code = $1 AND active = true AND is_deleted = false
       AND (valid_until IS NULL OR valid_until > NOW())
       AND (valid_from IS NULL OR valid_from <= NOW())`,
      [code]
    );

    if (res.rows.length === 0) {
      throw new Error('Invalid or expired offer code.');
    }

    const offer = res.rows[0];

    if (offer.offer_type !== 'GLOBAL' && offer.garage_id) {
      if (garageId && offer.garage_id !== garageId) {
        throw new Error('This offer is not applicable for this garage.');
      }
    }

    if (subtotal < Number(offer.min_order_amount)) {
      throw new Error(`Order subtotal must be at least ${offer.min_order_amount} to use this offer.`);
    }

    // Check usage limits
    if (offer.usage_limit !== null) {
      const globalUsageRes = await client.query(
        'SELECT COUNT(*) FROM offer_redemptions WHERE offer_id = $1',
        [offer.id]
      );
      if (Number(globalUsageRes.rows[0].count) >= offer.usage_limit) {
        throw new Error('This offer has reached its maximum usage limit.');
      }
    }

    if (offer.per_user_limit !== null) {
      const userUsageRes = await client.query(
        'SELECT COUNT(*) FROM offer_redemptions WHERE offer_id = $1 AND user_id = $2',
        [offer.id, userId]
      );
      if (Number(userUsageRes.rows[0].count) >= offer.per_user_limit) {
        throw new Error('You have reached the maximum usage limit for this offer.');
      }
    }

    // Calculate discount
    let discount = 0;
    if (offer.discount_type === 'PERCENTAGE') {
      discount = subtotal * (Number(offer.discount_value) / 100);
      if (offer.max_discount && discount > Number(offer.max_discount)) {
        discount = Number(offer.max_discount);
      }
    } else if (offer.discount_type === 'FIXED') {
      discount = Number(offer.discount_value);
    }

    return {
      isValid: true,
      offerId: offer.id,
      discount: Math.min(discount, subtotal), // Discount cannot exceed subtotal
      offerDetails: offer
    };
  } finally {
    client.release();
  }
}

export async function recordOfferRedemption(offerId: string, userId: string, bookingId: string, discountApplied: number) {
  const pool = getDbPool();
  await pool.query(
    `INSERT INTO offer_redemptions (offer_id, user_id, booking_id, discount_applied)
     VALUES ($1, $2, $3, $4)`,
    [offerId, userId, bookingId, discountApplied]
  );
}
