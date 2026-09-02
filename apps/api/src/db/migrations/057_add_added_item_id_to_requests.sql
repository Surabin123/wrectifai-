BEGIN;

-- Track whether a garage has already added an approved service request to their services.
-- NULL = not yet added. Non-null = the services.id row they created.
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS added_service_id UUID REFERENCES services(id) ON DELETE SET NULL;

-- Track whether a garage has already added an approved product request to their inventory.
-- NULL = not yet added. Non-null = the garage_inventory.id row they created.
ALTER TABLE product_requests
  ADD COLUMN IF NOT EXISTS added_inventory_id UUID REFERENCES garage_inventory(id) ON DELETE SET NULL;

COMMIT;
