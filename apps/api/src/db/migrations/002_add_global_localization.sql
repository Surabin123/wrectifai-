-- 002_add_global_localization.sql

-- Add global localization fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(3);

-- Add global localization fields to garages
ALTER TABLE garages ADD COLUMN IF NOT EXISTS country VARCHAR(2);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS locale VARCHAR(10);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS business_currency VARCHAR(3);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Note: Financial tables (quotes, bookings, products, orders, payments) 
-- already have a currency VARCHAR(3) NOT NULL DEFAULT 'USD' column. 
-- The application layer will now respect and provide this currency rather than defaulting to USD.
