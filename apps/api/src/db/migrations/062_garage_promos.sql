-- Add garage_id and lifecycle tracking to promos for Seasonal Care Combo Deals

ALTER TABLE promos
ADD COLUMN IF NOT EXISTS garage_id UUID REFERENCES garages(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Index for quick lookup by garage
CREATE INDEX IF NOT EXISTS idx_promos_garage_id ON promos(garage_id);
