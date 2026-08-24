-- Update garages approval_status CHECK constraint to include 'deleted' for soft deletion
ALTER TABLE garages DROP CONSTRAINT IF EXISTS garages_approval_status_check;
ALTER TABLE garages ADD CONSTRAINT garages_approval_status_check CHECK (approval_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'suspended'::character varying, 'active'::character varying, 'deleted'::character varying]::text[]));
