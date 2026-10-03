-- Restore optional fields required by the customer Quotes endpoint.
-- These columns were introduced by older migrations, but production can have
-- schema drift when those migrations were recorded without all DDL applying.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS details JSONB,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

ALTER TABLE garages
  ADD COLUMN IF NOT EXISTS established_year INTEGER;
