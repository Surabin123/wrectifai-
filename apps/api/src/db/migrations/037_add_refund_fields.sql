BEGIN;

-- 1. Add the refund ID tracking column
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_refund_id VARCHAR(255);

-- 2. Safely recreate the status constraint to include 'refund_failed'
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE payments ADD CONSTRAINT payments_status_check
    CHECK (status IN (
        'created', 
        'pending', 
        'paid', 
        'failed', 
        'refund_pending', 
        'refunded',
        'refund_failed',
        'requiresAction', 
        'succeeded'
    ));

COMMIT;
