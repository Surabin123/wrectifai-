BEGIN;

-- 1. Platform Services (Global Catalog)
CREATE TABLE IF NOT EXISTS platform_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100),
    description TEXT,
    icon VARCHAR(100),
    base_price NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link existing services table to platform catalog
ALTER TABLE services
  ADD COLUMN platform_service_id UUID REFERENCES platform_services(id) ON DELETE CASCADE;

-- 2. Modify Invoices to support Inventory Orders
ALTER TABLE invoices 
  ALTER COLUMN booking_id DROP NOT NULL,
  ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE CASCADE;

-- We need to drop any existing constraint if we're altering it, but since it's an additive check, we can just add it.
ALTER TABLE invoices
  ADD CONSTRAINT invoices_booking_or_order_check CHECK (
    (booking_id IS NOT NULL AND order_id IS NULL) OR 
    (booking_id IS NULL AND order_id IS NOT NULL)
  );

-- 3. Modify Orders to belong to a specific garage
ALTER TABLE orders 
  ADD COLUMN garage_id UUID REFERENCES garages(id) ON DELETE CASCADE;

-- 4. Create Order Items to track purchased products
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL
);

-- 5. Create Garage Inventory mapping (Product Stock per Garage)
CREATE TABLE IF NOT EXISTS garage_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty_available INTEGER NOT NULL DEFAULT 0 CHECK (qty_available >= 0),
    price NUMERIC(12, 2), -- override price
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(garage_id, product_id)
);

COMMIT;
