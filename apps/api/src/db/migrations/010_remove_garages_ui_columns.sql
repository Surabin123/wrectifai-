-- Remove visual presentation columns from garages table
ALTER TABLE garages DROP COLUMN IF EXISTS tone;
ALTER TABLE garages DROP COLUMN IF EXISTS artwork;
