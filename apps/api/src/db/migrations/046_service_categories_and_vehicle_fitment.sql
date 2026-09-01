BEGIN;

-- 1. Update service categories based on name
UPDATE services SET category = 'Maintenance' WHERE name ILIKE '%Oil%' OR name ILIKE '%AC Service%' OR name ILIKE '%General Service%' OR name ILIKE '%Periodic Maintenance%' OR name ILIKE '%Engine Service%' OR name ILIKE '%Wheel Balancing%' OR name ILIKE '%Wheel Alignment%' OR name ILIKE '%Tyre%' OR name ILIKE '%Tire%';
UPDATE services SET category = 'Repairs' WHERE name ILIKE '%Transmission%' OR name ILIKE '%Brake%' OR name ILIKE '%Engine Repair%' OR name ILIKE '%Steering%' OR name ILIKE '%Suspension%' OR name ILIKE '%Dent%';
UPDATE services SET category = 'Diagnostics' WHERE name ILIKE '%Diagnostic%';
UPDATE services SET category = 'Electrical' WHERE name ILIKE '%Battery%' OR name ILIKE '%Electrical Repair%' OR name ILIKE '%EV %';
UPDATE services SET category = 'Other' WHERE name ILIKE '%Detailing%' OR name ILIKE '%Coating%' OR name ILIKE '%Washing%' OR name ILIKE '%Painting%' OR name ILIKE '%Windshield%' OR name ILIKE '%Leather%' OR name ILIKE '%More%' OR name ILIKE '%service1%';

-- Ensure any remaining nulls get categorized
UPDATE services SET category = 'Other' WHERE category IS NULL;

-- 2. Populate product compatible_vehicle_rules
-- Air filter -> Maruti Suzuki Dzire
UPDATE products 
SET compatible_vehicle_rules = '{"makes": ["Maruti Suzuki"], "models": ["Dzire"]}'::jsonb 
WHERE name ILIKE '%Bosch Car Air Filter%';

-- Battery -> Honda, Maruti Suzuki
UPDATE products 
SET compatible_vehicle_rules = '{"makes": ["Maruti Suzuki", "Honda"]}'::jsonb 
WHERE name ILIKE '%Amaron Pro Rider Battery%';

-- Brake pads -> BMW, Audi
UPDATE products 
SET compatible_vehicle_rules = '{"makes": ["BMW", "Audi"]}'::jsonb 
WHERE name ILIKE '%Brembo Front Brake Pads%';

-- Oil Filter -> Hyundai, Kia
UPDATE products 
SET compatible_vehicle_rules = '{"makes": ["Hyundai", "Kia"]}'::jsonb 
WHERE name ILIKE '%Bosch Oil Filter%';

COMMIT;
