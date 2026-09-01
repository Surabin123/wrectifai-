BEGIN;

-- Fix duplicate seeded garages that have address in Hyderabad to be correctly assigned to city = 'Hyderabad'
UPDATE garages 
SET city = 'Hyderabad',
    location = jsonb_build_object(
      'lat', COALESCE((location->>'lat')::numeric, 17.4483),
      'lng', COALESCE((location->>'lng')::numeric, 78.3915),
      'city', 'Hyderabad',
      'locality', COALESCE(location->>'locality', 'Madhapur'),
      'country', 'India'
    )
WHERE address ILIKE '%Hyderabad%' AND id NOT IN (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000016',
  '00000000-0000-0000-0000-000000000017',
  '00000000-0000-0000-0000-000000000018',
  '00000000-0000-0000-0000-000000000019',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022'
);

-- Update the primary 12 Bengaluru garages to have correct address & location in Bengaluru
UPDATE garages SET address = 'Koramangala, Bengaluru', city = 'Bengaluru', location = jsonb_build_object('lat', 12.9279, 'lng', 77.6271, 'city', 'Bengaluru', 'locality', 'Koramangala', 'country', 'India') WHERE id = '00000000-0000-0000-0000-000000000011';
UPDATE garages SET address = 'Jayanagar, Bengaluru', city = 'Bengaluru', location = jsonb_build_object('lat', 12.9299, 'lng', 77.5833, 'city', 'Bengaluru', 'locality', 'Jayanagar', 'country', 'India') WHERE id = '00000000-0000-0000-0000-000000000012';
UPDATE garages SET address = 'Whitefield, Bengaluru', city = 'Bengaluru', location = jsonb_build_object('lat', 12.9698, 'lng', 77.7499, 'city', 'Bengaluru', 'locality', 'Whitefield', 'country', 'India') WHERE id = '00000000-0000-0000-0000-000000000013';
UPDATE garages SET address = 'Malleshwaram, Bengaluru', city = 'Bengaluru', location = jsonb_build_object('lat', 13.0031, 'lng', 77.5643, 'city', 'Bengaluru', 'locality', 'Malleshwaram', 'country', 'India') WHERE id = '00000000-0000-0000-0000-000000000014';
UPDATE garages SET address = 'HSR Layout, Bengaluru', city = 'Bengaluru', location = jsonb_build_object('lat', 12.9121, 'lng', 77.6446, 'city', 'Bengaluru', 'locality', 'HSR Layout', 'country', 'India') WHERE id = '00000000-0000-0000-0000-000000000015';
UPDATE garages SET address = 'JP Nagar, Bengaluru', city = 'Bengaluru', location = jsonb_build_object('lat', 12.9063, 'lng', 77.5857, 'city', 'Bengaluru', 'locality', 'JP Nagar', 'country', 'India') WHERE id = '00000000-0000-0000-0000-000000000016';
UPDATE garages SET address = 'BTM Layout, Bengaluru', city = 'Bengaluru', location = jsonb_build_object('lat', 12.9166, 'lng', 77.6101, 'city', 'Bengaluru', 'locality', 'BTM Layout', 'country', 'India') WHERE id = '00000000-0000-0000-0000-000000000017';
UPDATE garages SET address = 'Rajajinagar, Bengaluru', city = 'Bengaluru', location = jsonb_build_object('lat', 12.9982, 'lng', 77.5530, 'city', 'Bengaluru', 'locality', 'Rajajinagar', 'country', 'India') WHERE id = '00000000-0000-0000-0000-000000000018';
UPDATE garages SET address = 'Marathahalli, Bengaluru', city = 'Bengaluru', location = jsonb_build_object('lat', 12.9569, 'lng', 77.7011, 'city', 'Bengaluru', 'locality', 'Marathahalli', 'country', 'India') WHERE id = '00000000-0000-0000-0000-000000000019';
UPDATE garages SET address = 'Electronic City, Bengaluru', city = 'Bengaluru', location = jsonb_build_object('lat', 12.8399, 'lng', 77.6770, 'city', 'Bengaluru', 'locality', 'Electronic City', 'country', 'India') WHERE id = '00000000-0000-0000-0000-000000000020';
UPDATE garages SET address = 'Banashankari, Bengaluru', city = 'Bengaluru', location = jsonb_build_object('lat', 12.9255, 'lng', 77.5468, 'city', 'Bengaluru', 'locality', 'Banashankari', 'country', 'India') WHERE id = '00000000-0000-0000-0000-000000000021';
UPDATE garages SET address = 'Yelahanka, Bengaluru', city = 'Bengaluru', location = jsonb_build_object('lat', 13.1007, 'lng', 77.5963, 'city', 'Bengaluru', 'locality', 'Yelahanka', 'country', 'India') WHERE id = '00000000-0000-0000-0000-000000000022';

COMMIT;
