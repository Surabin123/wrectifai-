ALTER TABLE services ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(32) NOT NULL DEFAULT 'fixed';
ALTER TABLE services ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

ALTER TABLE services DROP CONSTRAINT IF EXISTS services_pricing_type_check;
ALTER TABLE services ADD CONSTRAINT services_pricing_type_check
  CHECK (pricing_type IN ('fixed', 'starting_from', 'inspection_required', 'custom_quote'));

INSERT INTO platform_services (name, category, description, base_price) VALUES
  ('Oil Change', 'Maintenance & General Service', 'Engine oil and filter replacement', NULL),
  ('Periodic Maintenance', 'Maintenance & General Service', 'Scheduled vehicle maintenance', NULL),
  ('General Service', 'Maintenance & General Service', 'General vehicle service', NULL),
  ('Engine Repair', 'Mechanical Repairs', 'Engine repair and overhaul', NULL),
  ('Brake Repair', 'Mechanical Repairs', 'Brake system repair', NULL),
  ('Suspension Repair', 'Mechanical Repairs', 'Suspension system repair', NULL),
  ('Transmission Repair', 'Mechanical Repairs', 'Transmission repair', NULL),
  ('Electrical Repair', 'Electrical & Diagnostics', 'Electrical-system repair', NULL),
  ('Computer Diagnostics', 'Electrical & Diagnostics', 'Computerised diagnostic scan', NULL),
  ('Vehicle Inspection', 'Electrical & Diagnostics', 'Vehicle inspection', NULL),
  ('Engine Diagnostics', 'Electrical & Diagnostics', 'Engine diagnostic assessment', NULL),
  ('Electrical Diagnostics', 'Electrical & Diagnostics', 'Electrical diagnostic assessment', NULL),
  ('Tyres & Wheel Care', 'Tyres & Wheel Care', 'Tyre and wheel service', NULL),
  ('AC Service', 'AC & Climate Control', 'Air-conditioning service', NULL),
  ('Denting and Painting', 'Bodywork & Appearance', 'Denting and paint repair', NULL),
  ('Body Repair', 'Bodywork & Appearance', 'Body repair', NULL),
  ('Exterior Repair', 'Bodywork & Appearance', 'Exterior repair', NULL),
  ('Battery Service', 'Additional Services', 'Battery testing and service', NULL)
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, description = EXCLUDED.description;

UPDATE platform_services
SET category = CASE name
  WHEN 'Brakes & Suspension' THEN 'Mechanical Repairs'
  WHEN 'Diagnostics' THEN 'Electrical & Diagnostics'
  WHEN 'Battery Service' THEN 'Additional Services'
  WHEN 'More Services' THEN 'Additional Services'
  ELSE category
END
WHERE name IN ('Brakes & Suspension', 'Diagnostics', 'Battery Service', 'More Services');
