-- Migration 067: Add contact phone and verification flag to garages
ALTER TABLE garages ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS is_contact_phone_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_mobile_verified BOOLEAN DEFAULT false;
