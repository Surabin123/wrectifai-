BEGIN;

-- 1. Insert Platform Services
INSERT INTO platform_services (name, category, icon, base_price) VALUES
('General Service', 'Maintenance', 'Wrench', 50.00),
('Engine Repair', 'Repair', 'Sparkles', 200.00),
('AC Service', 'Maintenance', 'Snowflake', 80.00),
('Brakes & Suspension', 'Repair', 'Gauge', 120.00),
('Battery Service', 'Electrical', 'BatteryCharging', 60.00),
('Tyres & Wheel Care', 'Maintenance', 'Disc3', 40.00),
('Diagnostics', 'Inspection', 'ClipboardList', 35.00),
('More Services', 'Other', 'SlidersHorizontal', 20.00)
ON CONFLICT (name) DO NOTHING;

-- Map existing services to platform_services
UPDATE services s
SET platform_service_id = ps.id
FROM platform_services ps
WHERE s.name = ps.name;

-- 2. Insert Platform Seller
INSERT INTO sellers (id, seller_type, approval_status)
SELECT uuid_generate_v4(), 'platform', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM sellers WHERE seller_type = 'platform');

-- 3. Insert Platform Products & Garage Inventory
DO $$
DECLARE
  v_seller_id UUID;
BEGIN
  SELECT id INTO v_seller_id FROM sellers WHERE seller_type = 'platform' LIMIT 1;
  
  -- Insert products
  INSERT INTO products (seller_id, name, category, price, is_active)
  SELECT v_seller_id, name, category, price, true
  FROM (VALUES
    ('Mobil 1 5W-30 Fully Synthetic Engine Oil', 'Oils & Fluids', 12.99),
    ('Bosch Car Air Filter', 'Engine Parts', 5.99),
    ('Amaron Pro Rider Battery 42B20L', 'Batteries', 42.99),
    ('Brembo Front Brake Pads', 'Brakes', 18.99),
    ('Philips H7 LED Headlight Bulb', 'Electrical', 14.99),
    ('Bosch Aerotwin Wiper Blade Set', 'Accessories', 8.99),
    ('Bosch Oil Filter', 'Engine Parts', 2.99),
    ('Liqui Moly Coolant Ready Mix 1L', 'Oils & Fluids', 4.99)
  ) AS v(name, category, price)
  WHERE NOT EXISTS (
    SELECT 1 FROM products WHERE name = v.name AND seller_id = v_seller_id
  );

  -- Seed Garage Inventory
  INSERT INTO garage_inventory (garage_id, product_id, qty_available, price, is_active)
  SELECT g.id, p.id, 
         (floor(random() * 20) + 5)::integer,
         p.price,
         true
  FROM garages g
  CROSS JOIN products p
  WHERE p.seller_id = v_seller_id
  ON CONFLICT (garage_id, product_id) DO NOTHING;

  -- Seed Garage Services for all garages that don't have them
  INSERT INTO services (garage_id, platform_service_id, name, price, is_active)
  SELECT g.id, ps.id, ps.name, ps.base_price, true
  FROM garages g
  CROSS JOIN platform_services ps
  WHERE NOT EXISTS (
      SELECT 1 FROM services s WHERE s.garage_id = g.id AND s.platform_service_id = ps.id
  );

END $$;

COMMIT;
