-- Product orders are collected from the garage; normalize historical shipping
-- statuses into the single garage-collection lifecycle without deleting rows.
BEGIN;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

UPDATE orders SET status = 'PENDING_ACCEPTANCE'
WHERE status IN ('pendingPayment', 'paid');

UPDATE orders SET status = 'ACCEPTED'
WHERE status IN ('processing', 'PACKING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY');

UPDATE orders SET status = 'COLLECTED'
WHERE status IN ('delivered', 'DELIVERED', 'collected');

UPDATE orders SET status = UPPER(status)
WHERE status IN ('readyForCollection', 'cancelled');

UPDATE orders SET status = 'READY_FOR_COLLECTION'
WHERE status = 'READYFORCOLLECTION';

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('PENDING_ACCEPTANCE', 'ACCEPTED', 'READY_FOR_COLLECTION', 'COLLECTED', 'CANCELLED'));

CREATE INDEX IF NOT EXISTS idx_orders_garage_status_created
  ON orders (garage_id, status, created_at DESC);

COMMIT;
