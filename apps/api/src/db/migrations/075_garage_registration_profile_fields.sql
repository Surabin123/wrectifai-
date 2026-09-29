-- Fields shared by the existing admin registration wizard and garage profile.
-- This migration is additive so historical garage records continue to work.
ALTER TABLE garages ADD COLUMN IF NOT EXISTS garage_type VARCHAR(160);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS owner_designation VARCHAR(160);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS state_region VARCHAR(160);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS postal_code VARCHAR(32);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS pricing_currency VARCHAR(3);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS timezone VARCHAR(80);

UPDATE garages
SET pricing_currency = COALESCE(pricing_currency, business_currency, 'USD')
WHERE pricing_currency IS NULL;

CREATE INDEX IF NOT EXISTS idx_garages_registration_number
  ON garages (registration_number)
  WHERE registration_number IS NOT NULL;
