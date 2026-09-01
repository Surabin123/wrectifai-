BEGIN;

-- 1. Add delivery_agent role to roles check constraint and table
-- PostgreSQL does not easily allow adding to an existing CHECK constraint without replacing it
ALTER TABLE roles DROP CONSTRAINT roles_code_check;
ALTER TABLE roles ADD CONSTRAINT roles_code_check CHECK (code IN ('customer', 'garage', 'vendor', 'admin', 'user', 'delivery_agent'));

INSERT INTO roles (code, name) VALUES ('delivery_agent', 'Delivery Agent')
ON CONFLICT (code) DO NOTHING;

-- 2. Create Delivery Assignments table
CREATE TABLE IF NOT EXISTS delivery_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    delivery_agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_assignments_order_id ON delivery_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_garage_id ON delivery_assignments(garage_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_agent_id ON delivery_assignments(delivery_agent_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_status ON delivery_assignments(status);

-- 3. Trigger for updated_at
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_delivery_assignments_updated_at') THEN
        CREATE TRIGGER update_delivery_assignments_updated_at 
        BEFORE UPDATE ON delivery_assignments 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMIT;
