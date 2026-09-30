-- Additive metadata for private garage-registration documents.
ALTER TABLE garage_documents ADD COLUMN IF NOT EXISTS original_filename VARCHAR(512);
ALTER TABLE garage_documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE garage_documents ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE garage_documents ADD COLUMN IF NOT EXISTS document_number VARCHAR(255);
ALTER TABLE garage_documents ADD COLUMN IF NOT EXISTS issuing_authority VARCHAR(255);
ALTER TABLE garage_documents ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE garage_documents ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE garage_documents ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE garage_documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE garage_documents ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_garage_documents_expiry_date
  ON garage_documents (expiry_date)
  WHERE expiry_date IS NOT NULL;
