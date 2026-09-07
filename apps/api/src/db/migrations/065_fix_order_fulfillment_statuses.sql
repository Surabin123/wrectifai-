BEGIN;

-- 1. Add payment_status column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING';

-- 2. Drop legacy status check constraint safely if exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 3. Add updated status check constraint (for fulfillment status) supporting both new canonical values and legacy values
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN (
    'PENDING_ACCEPTANCE', 
    'ACCEPTED', 
    'PACKING', 
    'PACKED', 
    'SHIPPED', 
    'OUT_FOR_DELIVERY', 
    'DELIVERED', 
    'CANCELLED',
    'pendingPayment',
    'paid',
    'processing',
    'readyForCollection',
    'collected'
  ));

-- 4. Add payment_status check constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED'));

-- 5. Migrate existing order rows cleanly
UPDATE orders SET payment_status = 'PAID', status = 'PENDING_ACCEPTANCE' WHERE status = 'paid' AND payment_status = 'PENDING';
UPDATE orders SET payment_status = 'PENDING', status = 'PENDING_ACCEPTANCE' WHERE status = 'pendingPayment' AND payment_status = 'PENDING';
UPDATE orders SET payment_status = 'PENDING', status = 'PACKING' WHERE status = 'processing' AND payment_status = 'PENDING';
UPDATE orders SET status = 'SHIPPED' WHERE status = 'shipped';
UPDATE orders SET status = 'DELIVERED' WHERE status = 'delivered';

COMMIT;
