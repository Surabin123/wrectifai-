-- Add is_hidden column to garage_reviews table
ALTER TABLE garage_reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
