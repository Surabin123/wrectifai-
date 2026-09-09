BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_rewards_referee ON referral_rewards(referee_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_wallet_credit ON wallet_transactions(reference_type, reference_id) WHERE reference_type = 'REFERRAL' AND reference_id IS NOT NULL;
COMMIT;
