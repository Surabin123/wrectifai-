-- Add checkin_mode and customer_note columns to bookings table if they are missing
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_mode TEXT DEFAULT 'self_checkin';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_note TEXT;
