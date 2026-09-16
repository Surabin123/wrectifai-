BEGIN;

-- Authentication & Token Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash_expires ON refresh_tokens(token_hash, expires_at);
CREATE INDEX IF NOT EXISTS idx_users_mobile_clean ON users (regexp_replace(mobile_number, '[^0-9]', '', 'g'));

-- Payment Provider Indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_status ON payments(booking_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_user_id, status);

-- Booking Lookup & Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status ON bookings(customer_id, status, payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_garage_status ON bookings(garage_id, status, scheduled_at);

-- Notification Recipient Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(user_id, is_read, created_at);

COMMIT;
