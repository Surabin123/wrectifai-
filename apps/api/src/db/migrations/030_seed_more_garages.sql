-- Seed additional garages across different cities for testing filters

INSERT INTO garages (id, owner_user_id, name, address, location, specializations, certifications, pickup_drop_supported, approval_status, rating_avg, rating_count)
VALUES 
-- Bengaluru (India)
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000003', 'AutoFix Pro', 'Indiranagar, Bengaluru', '{"lat": 12.9784, "lng": 77.6408, "city": "Bengaluru", "locality": "Indiranagar", "country": "India"}', ARRAY['engine', 'Inspection', 'Warranty', 'Pickup'], ARRAY['ASE Certified'], true, 'approved', 4.8, 250),

-- Mumbai (India)
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000003', 'Mumbai Motors', 'Andheri West, Mumbai', '{"lat": 19.1363, "lng": 72.8277, "city": "Mumbai", "locality": "Andheri West", "country": "India"}', ARRAY['Denting', 'Painting', 'Washing'], ARRAY['ISO 9001'], true, 'approved', 4.5, 120),

-- Dubai (UAE)
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000003', 'Dubai Luxury Auto', 'Al Quoz, Dubai', '{"lat": 25.1388, "lng": 55.2223, "city": "Dubai", "locality": "Al Quoz", "country": "United Arab Emirates"}', ARRAY['Luxury', 'AC Repair', 'Performance'], ARRAY['Premium Certified'], false, 'approved', 4.9, 500),

-- New York (USA)
('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000003', 'NY City Auto Repair', 'Manhattan, New York', '{"lat": 40.7831, "lng": -73.9712, "city": "New York", "locality": "Manhattan", "country": "United States"}', ARRAY['General Service', 'Brakes', 'Tires'], ARRAY['ASE Master'], true, 'approved', 4.7, 340)
ON CONFLICT (id) DO NOTHING;
