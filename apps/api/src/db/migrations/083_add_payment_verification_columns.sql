-- Keep the deployed payments schema compatible with the Razorpay verification flow.
-- These additions are nullable/defaulted so existing payment rows remain valid.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS signature_status VARCHAR(50);

-- Older deployments required these provider columns, while the current
-- booking payment flow supplies provider metadata in its newer columns.
ALTER TABLE payments
  ALTER COLUMN provider DROP NOT NULL,
  ALTER COLUMN provider_intent_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_transaction_id
  ON payments(transaction_id)
  WHERE transaction_id IS NOT NULL;
