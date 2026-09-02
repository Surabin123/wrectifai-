BEGIN;

-- Add rejection_history JSONB column to track history of rejections
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS rejection_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE product_requests ADD COLUMN IF NOT EXISTS rejection_history JSONB DEFAULT '[]'::jsonb;

COMMIT;
