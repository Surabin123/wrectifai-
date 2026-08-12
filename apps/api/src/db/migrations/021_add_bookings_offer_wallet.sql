-- Add offer and wallet tracking columns to bookings table

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES promos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_applied NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS wallet_used NUMERIC(10, 2) DEFAULT 0;
