BEGIN;

ALTER TABLE bookings 
    ADD COLUMN IF NOT EXISTS collection_time TIMESTAMPTZ;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('pendingPayment', 'confirmed', 'checkedIn', 'inService', 'completed', 'readyForCollection', 'collected', 'cancelled', 'refundPending', 'refunded', 'failed'));

COMMIT;
