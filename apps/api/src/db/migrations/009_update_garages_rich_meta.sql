-- Alter garages table to add rich metadata columns
ALTER TABLE garages ADD COLUMN IF NOT EXISTS starting_price VARCHAR(100);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS distance_km VARCHAR(100);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS tone VARCHAR(100);
ALTER TABLE garages ADD COLUMN IF NOT EXISTS artwork TEXT;
ALTER TABLE garages ADD COLUMN IF NOT EXISTS image TEXT;

-- Update QuickPit
UPDATE garages 
SET starting_price = 'Starting ₹599', 
    distance_km = '3.1 km', 
    tone = 'orange', 
    artwork = 'from-[#16181f] via-[#362219] to-[#5d2b20]', 
    image = '/assets/garage_2_1778071173295.png'
WHERE name = 'QuickPit Service Center';

-- Update SpeedFix
UPDATE garages 
SET starting_price = 'Starting ₹499', 
    distance_km = '2.2 km', 
    tone = 'green', 
    artwork = 'from-[#0b121d] via-[#2a241f] to-[#5b3823]', 
    image = '/assets/garage_1_1778071156220.png'
WHERE name = 'SpeedFix Auto Care';

-- Update AutoWorks
UPDATE garages 
SET starting_price = 'Starting ₹449', 
    distance_km = '4.5 km', 
    tone = 'blue', 
    artwork = 'from-[#2f2419] via-[#3c3127] to-[#1a1d25]', 
    image = '/assets/garage_3_1778071191282.png'
WHERE name = 'AutoWorks Garage';

-- Update Five Star
UPDATE garages 
SET starting_price = 'Starting ₹699', 
    distance_km = '5.2 km', 
    tone = 'blue', 
    artwork = 'from-[#151515] via-[#343434] to-[#6f4a3e]', 
    image = 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=600&q=80'
WHERE name = 'Five Star Automotive';

-- Update Metro Auto Bay
UPDATE garages 
SET starting_price = 'Starting ₹549', 
    distance_km = '2.8 km', 
    tone = 'green', 
    artwork = 'from-[#132135] via-[#29496f] to-[#1b2436]', 
    image = 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80'
WHERE name = 'Metro Auto Bay';

-- Update Royal Motor Service
UPDATE garages 
SET starting_price = 'Starting ₹529', 
    distance_km = '3.8 km', 
    tone = 'blue', 
    artwork = 'from-[#21242b] via-[#4a3328] to-[#1c2230]', 
    image = 'https://images.unsplash.com/photo-1600661653561-629509216228?auto=format&fit=crop&w=600&q=80'
WHERE name = 'Royal Motor Service';

-- Update PitStop Car Care
UPDATE garages 
SET starting_price = 'Starting ₹489', 
    distance_km = '4.9 km', 
    tone = 'blue', 
    artwork = 'from-[#151a22] via-[#324150] to-[#12161f]', 
    image = '/assets/garage_2_1778071173295.png'
WHERE name = 'PitStop Car Care';

-- Seed initial badges into garage_badges (clean run safety)
DELETE FROM garage_badges WHERE garage_id IN (
  SELECT id FROM garages WHERE name IN ('QuickPit Service Center', 'SpeedFix Auto Care', 'AutoWorks Garage', 'Metro Auto Bay')
);

INSERT INTO garage_badges (garage_id, badge_key, active) VALUES
((SELECT id FROM garages WHERE name = 'QuickPit Service Center'), 'mostTrusted', true),
((SELECT id FROM garages WHERE name = 'SpeedFix Auto Care'), 'topRated', true),
((SELECT id FROM garages WHERE name = 'AutoWorks Garage'), 'budgetFriendly', true),
((SELECT id FROM garages WHERE name = 'Metro Auto Bay'), 'topRated', true);
