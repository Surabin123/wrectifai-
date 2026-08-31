BEGIN;

-- 1. Fix bookings.status to only be service statuses
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('requested', 'confirmed', 'in_progress', 'completed', 'readyForCollection', 'collected', 'cancelled'));

-- Map existing mixed statuses in bookings.status to the new schema
UPDATE bookings SET status = 'requested' WHERE status IN ('pendingPayment', 'pending');
UPDATE bookings SET status = 'confirmed' WHERE status IN ('accepted');
UPDATE bookings SET status = 'in_progress' WHERE status = 'inService';
UPDATE bookings SET status = 'cancelled' WHERE status IN ('failed', 'rejected');
UPDATE bookings SET status = 'cancelled' WHERE status IN ('refundPending', 'refunded');

-- 2. Enforce bookings.payment_status to be the payment lifecycle
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
    CHECK (payment_status IN ('UNPAID', 'PAYMENT_DUE', 'PAYMENT_PROCESSING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED'));

-- Map existing lowercase/mixed payment_status
UPDATE bookings SET payment_status = 'UNPAID' WHERE payment_status IS NULL OR payment_status IN ('pending', 'pendingPayment');
UPDATE bookings SET payment_status = 'PAID' WHERE payment_status = 'paid';
UPDATE bookings SET payment_status = 'REFUND_PENDING' WHERE payment_status = 'refund_pending';
UPDATE bookings SET payment_status = 'REFUNDED' WHERE payment_status = 'refunded';
UPDATE bookings SET payment_status = 'REFUND_FAILED' WHERE payment_status = 'refund_failed';
UPDATE bookings SET payment_status = 'FAILED' WHERE payment_status = 'failed';

COMMIT;
