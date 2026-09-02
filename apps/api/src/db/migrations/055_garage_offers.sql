BEGIN;

-- Add Garage-specific offer columns to the existing offers table
ALTER TABLE offers
    ADD COLUMN IF NOT EXISTS garage_id UUID REFERENCES garages(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS offer_type VARCHAR(50) CHECK (offer_type IN ('SERVICE', 'PARTS', 'COMBO', 'GLOBAL')),
    ADD COLUMN IF NOT EXISTS applicable_item_id UUID,
    ADD COLUMN IF NOT EXISTS terms_conditions TEXT,
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Create an index to quickly filter offers by garage
CREATE INDEX IF NOT EXISTS idx_offers_garage_id ON offers(garage_id);

-- Update existing offers to be of type 'GLOBAL' if they have no type yet
UPDATE offers SET offer_type = 'GLOBAL' WHERE offer_type IS NULL;

COMMIT;
