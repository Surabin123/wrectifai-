BEGIN;

-- 1. Add image column to products table if missing
ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT;

-- 2. Update products with real image paths matching assets
UPDATE products SET image = '/assets/engine_oil_bottle.png' WHERE name ILIKE '%Engine Oil%' OR name ILIKE '%Mobil 1%';
UPDATE products SET image = '/assets/Parts and components.png' WHERE name ILIKE '%Air Filter%' AND image IS NULL;
UPDATE products SET image = '/assets/car_battery.png' WHERE name ILIKE '%Battery%' AND image IS NULL;
UPDATE products SET image = '/assets/brake_disc_1778070670609.png' WHERE name ILIKE '%Brake Pads%' AND image IS NULL;
UPDATE products SET image = '/assets/Electrical.png' WHERE (name ILIKE '%Bulb%' OR name ILIKE '%Headlight%') AND image IS NULL;
UPDATE products SET image = '/assets/wiper_blade_1778070781712.png' WHERE name ILIKE '%Wiper%' AND image IS NULL;
UPDATE products SET image = '/assets/oil_pour_1778070767058.png' WHERE name ILIKE '%Oil Filter%' AND image IS NULL;
UPDATE products SET image = '/assets/summer_combo_1778070704538.png' WHERE name ILIKE '%Coolant%' AND image IS NULL;
UPDATE products SET image = '/assets/Parts and components.png' WHERE image IS NULL;

-- 3. Synchronize garages city column with location JSONB
UPDATE garages 
SET city = location->>'city' 
WHERE location->>'city' IS NOT NULL AND (city IS NULL OR city != location->>'city');

-- 4. Update service prices to be garage-specific and non-zero per country
-- Update India garage services
UPDATE services s
SET price = CASE 
  WHEN s.name ILIKE '%Oil%' THEN 999.00
  WHEN s.name ILIKE '%Brake%' THEN 1499.00
  WHEN s.name ILIKE '%AC%' THEN 1299.00
  WHEN s.name ILIKE '%Battery%' THEN 599.00
  WHEN s.name ILIKE '%Diagnostics%' THEN 999.00
  WHEN s.name ILIKE '%Engine%' THEN 4999.00
  WHEN s.name ILIKE '%Tyre%' OR s.name ILIKE '%Wheel%' THEN 799.00
  ELSE 1999.00
END
FROM garages g
WHERE s.garage_id = g.id 
  AND (s.price = 0 OR s.price IS NULL OR s.price = 50.00)
  AND COALESCE(g.location->>'country', 'India') IN ('India', 'IN');

-- Update USA garage services
UPDATE services s
SET price = CASE 
  WHEN s.name ILIKE '%Oil%' THEN 49.99
  WHEN s.name ILIKE '%Brake%' THEN 129.99
  WHEN s.name ILIKE '%AC%' THEN 89.99
  WHEN s.name ILIKE '%Battery%' THEN 39.99
  WHEN s.name ILIKE '%Diagnostics%' THEN 79.99
  WHEN s.name ILIKE '%Engine%' THEN 449.99
  WHEN s.name ILIKE '%Tyre%' OR s.name ILIKE '%Wheel%' THEN 59.99
  ELSE 179.99
END
FROM garages g
WHERE s.garage_id = g.id 
  AND COALESCE(g.location->>'country', '') IN ('United States', 'US');

-- Update UAE garage services
UPDATE services s
SET price = CASE 
  WHEN s.name ILIKE '%Oil%' THEN 180.00
  WHEN s.name ILIKE '%Brake%' THEN 420.00
  WHEN s.name ILIKE '%AC%' THEN 280.00
  WHEN s.name ILIKE '%Battery%' THEN 120.00
  WHEN s.name ILIKE '%Diagnostics%' THEN 250.00
  WHEN s.name ILIKE '%Engine%' THEN 1400.00
  WHEN s.name ILIKE '%Tyre%' OR s.name ILIKE '%Wheel%' THEN 180.00
  ELSE 550.00
END
FROM garages g
WHERE s.garage_id = g.id 
  AND COALESCE(g.location->>'country', '') IN ('United Arab Emirates', 'AE');

-- 5. Update garage_inventory pricing by market/country
-- India garages inventory pricing in INR
UPDATE garage_inventory gi
SET price = CASE 
  WHEN p.name ILIKE '%Engine Oil%' THEN 1299.00
  WHEN p.name ILIKE '%Air Filter%' THEN 499.00
  WHEN p.name ILIKE '%Battery%' THEN 3899.00
  WHEN p.name ILIKE '%Brake Pads%' THEN 1999.00
  WHEN p.name ILIKE '%Bulb%' THEN 899.00
  WHEN p.name ILIKE '%Wiper%' THEN 799.00
  WHEN p.name ILIKE '%Oil Filter%' THEN 399.00
  WHEN p.name ILIKE '%Coolant%' THEN 599.00
  ELSE 999.00
END
FROM garages g, products p
WHERE gi.garage_id = g.id AND gi.product_id = p.id
  AND COALESCE(g.location->>'country', 'India') IN ('India', 'IN');

-- USA garages inventory pricing in USD
UPDATE garage_inventory gi
SET price = CASE 
  WHEN p.name ILIKE '%Engine Oil%' THEN 32.99
  WHEN p.name ILIKE '%Air Filter%' THEN 16.99
  WHEN p.name ILIKE '%Battery%' THEN 124.99
  WHEN p.name ILIKE '%Brake Pads%' THEN 49.99
  WHEN p.name ILIKE '%Bulb%' THEN 24.99
  WHEN p.name ILIKE '%Wiper%' THEN 19.99
  WHEN p.name ILIKE '%Oil Filter%' THEN 9.99
  WHEN p.name ILIKE '%Coolant%' THEN 17.99
  ELSE 29.99
END
FROM garages g, products p
WHERE gi.garage_id = g.id AND gi.product_id = p.id
  AND COALESCE(g.location->>'country', '') IN ('United States', 'US');

-- UAE garages inventory pricing in AED
UPDATE garage_inventory gi
SET price = CASE 
  WHEN p.name ILIKE '%Engine Oil%' THEN 105.00
  WHEN p.name ILIKE '%Air Filter%' THEN 55.00
  WHEN p.name ILIKE '%Battery%' THEN 350.00
  WHEN p.name ILIKE '%Brake Pads%' THEN 175.00
  WHEN p.name ILIKE '%Bulb%' THEN 85.00
  WHEN p.name ILIKE '%Wiper%' THEN 70.00
  WHEN p.name ILIKE '%Oil Filter%' THEN 35.00
  WHEN p.name ILIKE '%Coolant%' THEN 60.00
  ELSE 95.00
END
FROM garages g, products p
WHERE gi.garage_id = g.id AND gi.product_id = p.id
  AND COALESCE(g.location->>'country', '') IN ('United Arab Emirates', 'AE');

COMMIT;
