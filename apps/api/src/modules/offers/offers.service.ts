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

    // Calculate discount and cashback
    let discount = 0;
    let cashback = 0;
    if (offer.discount_type === 'PERCENTAGE') {
      discount = subtotal * (Number(offer.discount_value) / 100);
      if (offer.max_discount && discount > Number(offer.max_discount)) {
        discount = Number(offer.max_discount);
      }
    } else if (offer.discount_type === 'FIXED') {
      discount = Number(offer.discount_value);
    } else if (offer.discount_type === 'CASHBACK') {
      cashback = Number(offer.discount_value);
      // Percentage cashback check?
      if (offer.discount_value < 100 && String(offer.discount_value).includes('.')) { 
        // Or if there's a field for percentage, but let's assume it's fixed amount for now, or just calculate %
        // If the schema allows percentage cashback, we'd calculate it here. Assuming fixed for now.
      }
    }

    return {
      isValid: true,
      offerId: offer.id,
      discount: Math.min(discount, subtotal), // Discount cannot exceed subtotal
      cashback: cashback,
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

export async function processCashback(bookingId: string) {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get booking and offer info
    const bookingRes = await client.query(
      `SELECT b.customer_id, b.offer_id, b.total_amount, b.status, b.payment_status, o.discount_type, o.discount_value 
       FROM bookings b
       JOIN offers o ON b.offer_id = o.id
       WHERE b.id = $1`,
      [bookingId]
    );
    
    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }
    
    const b = bookingRes.rows[0];
    
    if (b.discount_type !== 'CASHBACK' || b.payment_status !== 'PAID' || (b.status !== 'completed' && b.status !== 'collected')) {
      await client.query('ROLLBACK');
      return;
    }
    
    const cashbackAmount = Number(b.discount_value);
    
    // Check if already credited
    const txCheck = await client.query(
      `SELECT id FROM wallet_transactions WHERE reference_id = $1 AND reference_type = 'CASHBACK'`,
      [bookingId]
    );
    
    if (txCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return;
    }
    
    // Ensure wallet exists
    await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING', [b.customer_id]);
    
    // Lock wallet
    const walletRes = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [b.customer_id]);
    const walletId = walletRes.rows[0].id;
    const balanceBefore = Number(walletRes.rows[0].balance);
    const balanceAfter = balanceBefore + cashbackAmount;
    
    // Update balance
    await client.query('UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2', [balanceAfter, walletId]);
    
    // Insert transaction
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, reference_type, reference_id, status, description)
       VALUES ($1, 'CREDIT', $2, $3, $4, 'CASHBACK', $5, 'COMPLETED', 'Cashback for Booking')`,
      [walletId, cashbackAmount, balanceBefore, balanceAfter, bookingId]
    );
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to process cashback for booking:', bookingId, err);
  } finally {
    client.release();
  }
}
