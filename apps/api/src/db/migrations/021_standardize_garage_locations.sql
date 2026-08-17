-- Standardize coordinates for seeded garages and AutoFix Pro without modifying any other data

-- 1. AutoFix Pro (Indiranagar, Bengaluru)
UPDATE garages SET location = jsonb_build_object('lat', 12.9784, 'lng', 77.6408, 'city', 'Bengaluru', 'locality', 'Indiranagar', 'country', 'India') WHERE name = 'AutoFix Pro';

-- 2. QuickPit Service Center (Madhapur, Hyderabad)
UPDATE garages SET location = jsonb_build_object('lat', 17.4483, 'lng', 78.3915, 'city', 'Hyderabad', 'locality', 'Madhapur', 'country', 'India') WHERE name = 'QuickPit Service Center';

-- 3. SpeedFix Auto Care (Kondapur, Hyderabad)
UPDATE garages SET location = jsonb_build_object('lat', 17.4622, 'lng', 78.3569, 'city', 'Hyderabad', 'locality', 'Kondapur', 'country', 'India') WHERE name = 'SpeedFix Auto Care';

-- 4. AutoWorks Garage (Gachibowli, Hyderabad)
UPDATE garages SET location = jsonb_build_object('lat', 17.4401, 'lng', 78.3489, 'city', 'Hyderabad', 'locality', 'Gachibowli', 'country', 'India') WHERE name = 'AutoWorks Garage';

-- 5. Metro Auto Bay (Hitech City, Hyderabad)
UPDATE garages SET location = jsonb_build_object('lat', 17.4435, 'lng', 78.3772, 'city', 'Hyderabad', 'locality', 'Hitech City', 'country', 'India') WHERE name = 'Metro Auto Bay';

-- 6. Royal Motor Service (Jubilee Hills, Hyderabad)
UPDATE garages SET location = jsonb_build_object('lat', 17.4326, 'lng', 78.4071, 'city', 'Hyderabad', 'locality', 'Jubilee Hills', 'country', 'India') WHERE name = 'Royal Motor Service';

-- 7. PitStop Car Care (Kukatpally, Hyderabad)
UPDATE garages SET location = jsonb_build_object('lat', 17.4948, 'lng', 78.3996, 'city', 'Hyderabad', 'locality', 'Kukatpally', 'country', 'India') WHERE name = 'PitStop Car Care';

-- 8. Galaxy Auto Garage (Miyapur, Hyderabad)
UPDATE garages SET location = jsonb_build_object('lat', 17.4968, 'lng', 78.3614, 'city', 'Hyderabad', 'locality', 'Miyapur', 'country', 'India') WHERE name = 'Galaxy Auto Garage';

-- 9. TorquePlus Service Hub (Ameerpet, Hyderabad)
UPDATE garages SET location = jsonb_build_object('lat', 17.4375, 'lng', 78.4482, 'city', 'Hyderabad', 'locality', 'Ameerpet', 'country', 'India') WHERE name = 'TorquePlus Service Hub';

-- 10. Five Star Automotive (Banjara Hills, Hyderabad)
UPDATE garages SET location = jsonb_build_object('lat', 17.4156, 'lng', 78.4347, 'city', 'Hyderabad', 'locality', 'Banjara Hills', 'country', 'India') WHERE name = 'Five Star Automotive';

-- 11. Prime Service Point (Secunderabad, Hyderabad)
UPDATE garages SET location = jsonb_build_object('lat', 17.4399, 'lng', 78.4983, 'city', 'Hyderabad', 'locality', 'Secunderabad', 'country', 'India') WHERE name = 'Prime Service Point';

-- 12. Urban Garage Works (Begumpet, Hyderabad)
UPDATE garages SET location = jsonb_build_object('lat', 17.4447, 'lng', 78.4664, 'city', 'Hyderabad', 'locality', 'Begumpet', 'country', 'India') WHERE name = 'Urban Garage Works';

-- 13. CarNest Workshop (Manikonda, Hyderabad)
UPDATE garages SET location = jsonb_build_object('lat', 17.3992, 'lng', 78.3887, 'city', 'Hyderabad', 'locality', 'Manikonda', 'country', 'India') WHERE name = 'CarNest Workshop';
