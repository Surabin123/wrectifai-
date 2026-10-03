-- The customer Quotes endpoint includes the vehicle fuel type in its response.
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(50);
