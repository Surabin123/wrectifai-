BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cashback_wallet_credit
  ON wallet_transactions(reference_type, reference_id)
  WHERE reference_type = 'CASHBACK' AND reference_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_refund_wallet_credit
  ON wallet_transactions(reference_type, reference_id)
  WHERE reference_type = 'BOOKING' AND type = 'REFUND' AND reference_id IS NOT NULL;
COMMIT;
