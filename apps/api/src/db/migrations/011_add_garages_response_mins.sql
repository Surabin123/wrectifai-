-- Alter garages table to add response_mins column
ALTER TABLE garages ADD COLUMN IF NOT EXISTS response_mins INTEGER DEFAULT 30;

-- Update response times for seeded garages
UPDATE garages SET response_mins = 40 WHERE name = 'QuickPit Service Center';
UPDATE garages SET response_mins = 30 WHERE name = 'SpeedFix Auto Care';
UPDATE garages SET response_mins = 45 WHERE name = 'AutoWorks Garage';
UPDATE garages SET response_mins = 50 WHERE name = 'Five Star Automotive';
UPDATE garages SET response_mins = 35 WHERE name = 'Royal Motor Service';
UPDATE garages SET response_mins = 40 WHERE name = 'PitStop Car Care';
UPDATE garages SET response_mins = 55 WHERE name = 'Galaxy Auto Garage';
UPDATE garages SET response_mins = 60 WHERE name = 'TorquePlus Service Hub';
UPDATE garages SET response_mins = 25 WHERE name = 'Metro Auto Bay';
UPDATE garages SET response_mins = 55 WHERE name = 'Urban Garage Works';
UPDATE garages SET response_mins = 35 WHERE name = 'Prime Service Point';
UPDATE garages SET response_mins = 48 WHERE name = 'CarNest Workshop';
