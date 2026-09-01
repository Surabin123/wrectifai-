BEGIN;

-- 1. Randomize prices based on country for ALL existing garage_inventory records.
-- We do this dynamically by joining with garages and products tables.
UPDATE garage_inventory gi
SET price = CASE 
    WHEN g.location->>'country' ILIKE '%United Arab Emirates%' OR g.location->>'country' ILIKE '%UAE%' 
      THEN ROUND((p.price * 3.67 * (0.9 + random() * 0.2))::numeric, 0)
    WHEN g.location->>'country' ILIKE '%United States%' OR g.location->>'country' ILIKE '%USA%' 
      THEN ROUND((p.price * (0.9 + random() * 0.2))::numeric, 0)
    ELSE 
      ROUND((p.price * 83 * (0.9 + random() * 0.2))::numeric, 0)
  END
FROM garages g, products p
WHERE gi.garage_id = g.id AND gi.product_id = p.id;

-- 2. Delete some inventory rows so each garage has a UNIQUE subset of products, rather than the global list.
-- We use a pseudo-random condition based on the UUIDs so it works dynamically in any environment.
-- This will delete roughly 50% of the products per garage.
DELETE FROM garage_inventory
WHERE (ascii(substring(garage_id::text from 1 for 1)) + ascii(substring(product_id::text from 1 for 1))) % 2 = 0;

COMMIT;
