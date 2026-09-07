BEGIN;

-- Add image column to services table to persist custom uploaded images
ALTER TABLE services ADD COLUMN IF NOT EXISTS image VARCHAR(255);

COMMIT;
