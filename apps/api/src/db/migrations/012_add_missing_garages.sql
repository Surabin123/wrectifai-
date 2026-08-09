-- Migration to restore all 12 hardcoded garages to the database and ensure correct metadata

-- Insert or update all 12 garages
INSERT INTO garages (
    id, 
    owner_user_id, 
    name, 
    address, 
    specializations, 
    approval_status, 
    rating_avg, 
    rating_count, 
    distance_km, 
    response_mins, 
    image
) VALUES
-- 1. QuickPit Service Center
(
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000003',
    'QuickPit Service Center',
    'Madhapur, Hyderabad',
    ARRAY['1 Month Warranty', 'Free Inspection', 'Free Pickup', 'Pay After Service'],
    'approved',
    4.5,
    96,
    '3.1 km',
    40,
    '/assets/garage_1_1778071156220.png'
),
-- 2. SpeedFix Auto Care
(
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000003',
    'SpeedFix Auto Care',
    'Kondapur, Hyderabad',
    ARRAY['Warranty Available', 'Free Pickup', 'Original Parts', 'Pay After Service'],
    'approved',
    4.6,
    128,
    '2.2 km',
    30,
    '/assets/garage_2_1778071173295.png'
),
-- 3. AutoWorks Garage
(
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000003',
    'AutoWorks Garage',
    'Gachibowli, Hyderabad',
    ARRAY['1 Month Warranty', 'Free Inspection', 'Original Parts', 'Pay After Service'],
    'approved',
    4.4,
    110,
    '4.2 km',
    45,
    '/assets/garage_3_1778071191282.png'
),
-- 4. Five Star Automotive
(
    '00000000-0000-0000-0000-000000000014',
    '00000000-0000-0000-0000-000000000003',
    'Five Star Automotive',
    'Banjara Hills, Hyderabad',
    ARRAY['Free Inspection', 'Pay After Service', 'Free Pickup', '1 Month Warranty'],
    'approved',
    4.3,
    78,
    '5.2 km',
    50,
    '/assets/garage_4_1778071611328.png'
),
-- 5. Royal Motor Service
(
    '00000000-0000-0000-0000-000000000016',
    '00000000-0000-0000-0000-000000000003',
    'Royal Motor Service',
    'Jubilee Hills, Hyderabad',
    ARRAY['1 Month Warranty', 'AC Service Expert', 'Free Pickup', 'Quality Parts'],
    'approved',
    4.2,
    64,
    '3.8 km',
    35,
    '/assets/garage_5_1778071628253.png'
),
-- 6. PitStop Car Care
(
    '00000000-0000-0000-0000-000000000017',
    '00000000-0000-0000-0000-000000000003',
    'PitStop Car Care',
    'Kukatpally, Hyderabad',
    ARRAY['Free Inspection', 'Quick Service', 'Pay After Service', '1 Month Warranty'],
    'approved',
    4.1,
    58,
    '4.9 km',
    40,
    '/assets/garage_1_1778071156220.png'
),
-- 7. Galaxy Auto Garage
(
    '00000000-0000-0000-0000-000000000019',
    '00000000-0000-0000-0000-000000000003',
    'Galaxy Auto Garage',
    'Miyapur, Hyderabad',
    ARRAY['1 Month Warranty', 'Pick & Drop', 'Genuine Parts', 'Free Inspection'],
    'approved',
    4.3,
    92,
    '3.6 km',
    55,
    '/assets/garage_2_1778071173295.png'
),
-- 8. TorquePlus Service Hub
(
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000003',
    'TorquePlus Service Hub',
    'Ameerpet, Hyderabad',
    ARRAY['Warranty Available', 'Genuine Parts', 'Pick & Drop', 'Pay After Service'],
    'approved',
    4.2,
    71,
    '6.1 km',
    60,
    '/assets/garage_3_1778071191282.png'
),
-- 9. Metro Auto Bay
(
    '00000000-0000-0000-0000-000000000015',
    '00000000-0000-0000-0000-000000000003',
    'Metro Auto Bay',
    'Hitech City, Hyderabad',
    ARRAY['Free Inspection', 'Warranty Available', 'Free Pickup', 'Quick Service'],
    'approved',
    4.7,
    142,
    '2.8 km',
    25,
    '/assets/garage_4_1778071611328.png'
),
-- 10. Urban Garage Works
(
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000003',
    'Urban Garage Works',
    'Begumpet, Hyderabad',
    ARRAY['Pay After Service', 'Free Pickup', 'Quality Parts', 'AC Service Expert'],
    'pending',
    4.0,
    53,
    '5.8 km',
    55,
    '/assets/garage_5_1778071628253.png'
),
-- 11. Prime Service Point
(
    '00000000-0000-0000-0000-000000000018',
    '00000000-0000-0000-0000-000000000003',
    'Prime Service Point',
    'Secunderabad, Hyderabad',
    ARRAY['Original Parts', 'Pay After Service', 'Free Inspection', 'Pick & Drop'],
    'approved',
    4.6,
    119,
    '4.4 km',
    35,
    '/assets/garage_1_1778071156220.png'
),
-- 12. CarNest Workshop
(
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000003',
    'CarNest Workshop',
    'Manikonda, Hyderabad',
    ARRAY['1 Month Warranty', 'Free Pickup', 'Inspection', 'Genuine Parts'],
    'pending',
    4.1,
    61,
    '6.4 km',
    48,
    '/assets/garage_2_1778071173295.png'
)
ON CONFLICT (id) DO UPDATE SET
    owner_user_id = EXCLUDED.owner_user_id,
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    specializations = EXCLUDED.specializations,
    approval_status = EXCLUDED.approval_status,
    rating_avg = EXCLUDED.rating_avg,
    rating_count = EXCLUDED.rating_count,
    distance_km = EXCLUDED.distance_km,
    response_mins = EXCLUDED.response_mins,
    image = EXCLUDED.image;

-- Seed/Update garage badges
DELETE FROM garage_badges WHERE garage_id IN (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000015',
    '00000000-0000-0000-0000-000000000018'
);

INSERT INTO garage_badges (garage_id, badge_key, active) VALUES
('00000000-0000-0000-0000-000000000011', 'budgetFriendly', true), -- QuickPit (Best Value)
('00000000-0000-0000-0000-000000000012', 'mostTrusted', true),    -- SpeedFix (Most Trusted)
('00000000-0000-0000-0000-000000000013', 'topRated', true),      -- AutoWorks (Top Rated)
('00000000-0000-0000-0000-000000000015', 'topRated', true),      -- Metro Auto Bay (Top Rated)
('00000000-0000-0000-0000-000000000018', 'mostTrusted', true);    -- Prime Service Point (Most Trusted)
