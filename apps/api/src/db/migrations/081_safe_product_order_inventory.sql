BEGIN;

-- Historical orders predate reservation tracking, so they must not be treated
-- as holding stock they may never have decremented.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS inventory_status VARCHAR(20) NOT NULL DEFAULT 'RELEASED',
  ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checkout_session_id VARCHAR(255);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_inventory_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_inventory_status_check
  CHECK (inventory_status IN ('RESERVED', 'COMMITTED', 'RELEASED'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUND_FAILED', 'REFUNDED'));

-- Only newly created orders populate this key; historical JSON checkout IDs
-- are still checked by the route under a transaction-scoped advisory lock.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_checkout_session
  ON orders(customer_id, garage_id, checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_expired_inventory_reservations
  ON orders(reservation_expires_at)
  WHERE payment_status = 'PENDING' AND inventory_status = 'RESERVED';

COMMIT;
