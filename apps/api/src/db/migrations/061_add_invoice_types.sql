BEGIN;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'invoice' CHECK (type IN ('invoice', 'credit_note'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
COMMIT;
