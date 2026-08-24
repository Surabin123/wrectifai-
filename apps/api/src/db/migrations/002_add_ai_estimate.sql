-- Add ai_estimate to quote_requests table
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS ai_estimate JSONB;
