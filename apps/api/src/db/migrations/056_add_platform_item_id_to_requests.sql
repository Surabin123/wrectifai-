BEGIN;

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS platform_service_id UUID REFERENCES platform_services(id) ON DELETE SET NULL;
ALTER TABLE product_requests ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

COMMIT;
