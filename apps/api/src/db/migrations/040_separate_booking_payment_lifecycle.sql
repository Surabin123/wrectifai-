BEGIN;

-- 1. Temporarily drop the old constraint so we can transition to new values
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Map existing mixed statuses in bookings.status to the new schema
UPDATE bookings SET status = 'requested' WHERE LOWER(status) IN ('pendingpayment', 'pending');
UPDATE bookings SET status = 'confirmed' WHERE LOWER(status) IN ('accepted');
UPDATE bookings SET status = 'in_progress' WHERE LOWER(status) IN ('inservice', 'in_progress');
UPDATE bookings SET status = 'cancelled' WHERE LOWER(status) IN ('failed', 'rejected', 'cancelled');
UPDATE bookings SET status = 'cancelled' WHERE LOWER(status) IN ('refundpending', 'refunded');

-- Catch-all fallback for any other legacy/null service statuses
UPDATE bookings SET status = 'requested' 
WHERE status IS NULL OR status NOT IN ('requested', 'confirmed', 'in_progress', 'completed', 'readyForCollection', 'collected', 'cancelled');

-- Apply the new strict constraint
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('requested', 'confirmed', 'in_progress', 'completed', 'readyForCollection', 'collected', 'cancelled'));

-- 2. Temporarily drop the old payment constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

-- Map existing lowercase/mixed payment_status (case-insensitive for safety)
UPDATE bookings SET payment_status = 'UNPAID' WHERE payment_status IS NULL OR LOWER(payment_status) IN ('pending', 'pendingpayment');
UPDATE bookings SET payment_status = 'PAID' WHERE LOWER(payment_status) = 'paid';
UPDATE bookings SET payment_status = 'REFUND_PENDING' WHERE LOWER(payment_status) = 'refund_pending';
UPDATE bookings SET payment_status = 'REFUNDED' WHERE LOWER(payment_status) = 'refunded';
UPDATE bookings SET payment_status = 'REFUND_FAILED' WHERE LOWER(payment_status) = 'refund_failed';
UPDATE bookings SET payment_status = 'FAILED' WHERE LOWER(payment_status) = 'failed';

-- Catch-all fallback for any other legacy/null payment statuses
UPDATE bookings SET payment_status = 'UNPAID'
WHERE payment_status IS NULL OR payment_status NOT IN ('UNPAID', 'PAYMENT_DUE', 'PAYMENT_PROCESSING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED');

-- Apply the new strict payment constraint
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
    CHECK (payment_status IN ('UNPAID', 'PAYMENT_DUE', 'PAYMENT_PROCESSING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED'));

COMMIT;
