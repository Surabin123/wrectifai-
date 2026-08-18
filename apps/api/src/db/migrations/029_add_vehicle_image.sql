-- Add image column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image TEXT;
