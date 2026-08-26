BEGIN;

-- Add provider_refund_id column to track Razorpay Refund IDs
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_refund_id VARCHAR(255);

-- Drop and recreate the payments_status_check constraint to include 'refund_failed'
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('created', 'pending', 'paid', 'failed', 'refund_pending', 'refunded', 'refund_failed', 'requiresAction', 'succeeded'));

COMMIT;
