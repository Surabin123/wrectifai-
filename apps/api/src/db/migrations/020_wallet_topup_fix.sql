BEGIN;

-- ============================================
-- Migration 020: Wallet tables + payments column fix
-- Safe to re-run: all DDL uses IF NOT EXISTS guards.
-- ============================================

-- 1. Create wallets table (idempotent)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- 2. Create wallet_transactions table (idempotent)
--    reference_id is TEXT so Razorpay IDs (pay_..., order_...) can be stored safely.
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT', 'REFUND', 'REWARD', 'TOP_UP', 'HOLD', 'RELEASE')),
    amount NUMERIC(12, 2) NOT NULL,
    balance_before NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    reference_type VARCHAR(100),
    reference_id TEXT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If migration 019 already created wallet_transactions with reference_id UUID,
-- change it to TEXT so Razorpay pay_... IDs can be stored without casting.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallet_transactions'
      AND column_name = 'reference_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE wallet_transactions ALTER COLUMN reference_id TYPE TEXT USING reference_id::TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);

-- 3. Add Razorpay-specific columns to payments (idempotent)
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS signature_status VARCHAR(50);

-- 4. Widen payments status constraint to include refund_pending
--    (original constraint only had: created, requiresAction, succeeded, failed, refunded)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('created', 'pending', 'paid', 'failed', 'refund_pending', 'refunded', 'requiresAction', 'succeeded'));

-- 5. Idempotency index on provider_payment_id
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);

-- 6. Webhook idempotency table (idempotent)
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);

COMMIT;
