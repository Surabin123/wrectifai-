BEGIN;

-- Provider identifiers are the idempotency keys used by verification and webhooks.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_payment_id_nonnull
  ON payments(provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_order_id_nonnull
  ON payments(provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_refund_id_nonnull
  ON payments(provider_refund_id) WHERE provider_refund_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_topup_provider_payment
  ON wallet_transactions(reference_type, reference_id)
  WHERE reference_type = 'TOPUP' AND reference_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_payment_intent_nonnull
  ON bookings(payment_intent_id) WHERE payment_intent_id IS NOT NULL;

COMMIT;
