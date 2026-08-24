-- Add expires_at column to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
