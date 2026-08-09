-- Migration 003: Add soft delete support to vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Index for querying active vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);
