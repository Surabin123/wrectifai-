-- Add checkin_mode and customer_note columns to bookings table if they are missing
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_mode TEXT DEFAULT 'self_checkin';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_note TEXT;

-- Add missing columns to quote_requests table
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS garage_id UUID REFERENCES garages(id) ON DELETE CASCADE;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE;

-- Add missing columns to garages table
ALTER TABLE garages ADD COLUMN IF NOT EXISTS address_line TEXT;
ALTER TABLE garages ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE garages ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE garages ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE garages ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
ALTER TABLE garages ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE garages ADD COLUMN IF NOT EXISTS trust_score NUMERIC(3, 2);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS business_hours JSONB;

-- Update garages approval_status CHECK constraint
ALTER TABLE garages DROP CONSTRAINT IF EXISTS garages_approval_status_check;
ALTER TABLE garages ADD CONSTRAINT garages_approval_status_check CHECK (approval_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'suspended'::character varying]::text[]));
