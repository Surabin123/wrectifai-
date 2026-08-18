-- Move dummy garages from Hyderabad to Bengaluru so user sees 13 garages in their default city

UPDATE garages SET location = jsonb_build_object('lat', 12.9279, 'lng', 77.6271, 'city', 'Bengaluru', 'locality', 'Koramangala', 'country', 'India') WHERE name = 'QuickPit Service Center';
UPDATE garages SET location = jsonb_build_object('lat', 12.9299, 'lng', 77.5833, 'city', 'Bengaluru', 'locality', 'Jayanagar', 'country', 'India') WHERE name = 'SpeedFix Auto Care';
UPDATE garages SET location = jsonb_build_object('lat', 12.9698, 'lng', 77.7499, 'city', 'Bengaluru', 'locality', 'Whitefield', 'country', 'India') WHERE name = 'AutoWorks Garage';
UPDATE garages SET location = jsonb_build_object('lat', 12.9121, 'lng', 77.6446, 'city', 'Bengaluru', 'locality', 'HSR Layout', 'country', 'India') WHERE name = 'Metro Auto Bay';
UPDATE garages SET location = jsonb_build_object('lat', 12.9063, 'lng', 77.5857, 'city', 'Bengaluru', 'locality', 'JP Nagar', 'country', 'India') WHERE name = 'Royal Motor Service';
UPDATE garages SET location = jsonb_build_object('lat', 12.9166, 'lng', 77.6101, 'city', 'Bengaluru', 'locality', 'BTM Layout', 'country', 'India') WHERE name = 'PitStop Car Care';
UPDATE garages SET location = jsonb_build_object('lat', 12.9569, 'lng', 77.7011, 'city', 'Bengaluru', 'locality', 'Marathahalli', 'country', 'India') WHERE name = 'Galaxy Auto Garage';
UPDATE garages SET location = jsonb_build_object('lat', 12.8399, 'lng', 77.6770, 'city', 'Bengaluru', 'locality', 'Electronic City', 'country', 'India') WHERE name = 'TorquePlus Service Hub';
UPDATE garages SET location = jsonb_build_object('lat', 13.0031, 'lng', 77.5643, 'city', 'Bengaluru', 'locality', 'Malleshwaram', 'country', 'India') WHERE name = 'Five Star Automotive';
UPDATE garages SET location = jsonb_build_object('lat', 12.9982, 'lng', 77.5530, 'city', 'Bengaluru', 'locality', 'Rajajinagar', 'country', 'India') WHERE name = 'Prime Service Point';
UPDATE garages SET location = jsonb_build_object('lat', 12.9255, 'lng', 77.5468, 'city', 'Bengaluru', 'locality', 'Banashankari', 'country', 'India') WHERE name = 'Urban Garage Works';
UPDATE garages SET location = jsonb_build_object('lat', 13.1007, 'lng', 77.5963, 'city', 'Bengaluru', 'locality', 'Yelahanka', 'country', 'India') WHERE name = 'CarNest Workshop';
