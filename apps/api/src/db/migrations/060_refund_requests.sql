BEGIN;

CREATE TABLE IF NOT EXISTS refund_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    explanation TEXT,
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    calculated_refund_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'info_requested', 'approved', 'rejected')),
    rejection_reason TEXT,
    garage_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_refund_requests_updated_at 
BEFORE UPDATE ON refund_requests 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
