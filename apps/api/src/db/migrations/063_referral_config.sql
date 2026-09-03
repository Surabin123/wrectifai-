BEGIN;

CREATE TABLE IF NOT EXISTS referral_configs (
    id SERIAL PRIMARY KEY,
    region VARCHAR(50) UNIQUE NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reward_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO referral_configs (region, is_enabled, reward_amount, currency) VALUES
('India', TRUE, 500.00, 'INR'),
('UAE', TRUE, 50.00, 'AED'),
('USA', TRUE, 20.00, 'USD')
ON CONFLICT (region) DO UPDATE 
SET is_enabled = EXCLUDED.is_enabled, 
    reward_amount = EXCLUDED.reward_amount, 
    currency = EXCLUDED.currency;

ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS status_reason VARCHAR(255);

COMMIT;
