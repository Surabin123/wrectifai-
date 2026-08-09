-- Add details column to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS details JSONB;

-- Seed Prime Service Point Garage if not exists
INSERT INTO garages (id, owner_user_id, name, address, location, specializations, certifications, pickup_drop_supported, approval_status, rating_avg, rating_count)
VALUES ('00000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000003', 'Prime Service Point', 'Gachibowli, Hyderabad', '{"lat": 17.4411, "lng": 78.3499}', ARRAY['engine', 'Inspection', 'Warranty'], ARRAY['ASE Certified'], true, 'approved', 4.6, 119)
ON CONFLICT (id) DO NOTHING;

-- Seed a default quote request
INSERT INTO quote_requests (id, customer_id, vehicle_id, issue_summary, preferred_date, status, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000030', 
    '00000000-0000-0000-0000-000000000001', 
    '00000000-0000-0000-0000-000000000002', 
    'Wheel Balance and Wheel Alignment', 
    NOW() + INTERVAL '3 days', 
    'quoted', 
    NOW() - INTERVAL '2 hours'
)
ON CONFLICT (id) DO NOTHING;

-- Seed quotes corresponding to quotesList in quotes-shared.ts
INSERT INTO quotes (id, quote_request_id, garage_id, amount, currency, eta_days, status, created_at, details)
VALUES
(
    '00000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000011', -- QuickPit Service Center
    3050.00,
    'USD',
    1,
    'active',
    NOW() - INTERVAL '10 minutes',
    '{
        "ui_status": "new",
        "parts": 1650,
        "labour": 1050,
        "consumables": 200,
        "gst": 150,
        "availability": "Today, 6:00 PM",
        "pickup_drop": "Available",
        "warranty": "6 Months / 10,000 km",
        "experience": "8+ Years",
        "savings": 450,
        "tag": "Express service",
        "image": "/assets/garage_2_1778071173295.png"
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000013', -- AutoWorks Garage
    3450.00,
    'USD',
    2,
    'active',
    NOW() - INTERVAL '25 minutes',
    '{
        "ui_status": "new",
        "parts": 1900,
        "labour": 1250,
        "consumables": 250,
        "gst": 200,
        "availability": "Tomorrow, 10:00 AM",
        "pickup_drop": "Not Available",
        "warranty": "3 Months / 5,000 km",
        "experience": "6+ Years",
        "savings": 250,
        "tag": "Specialized repair",
        "image": "/assets/garage_3_1778071191282.png"
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000043',
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000012', -- SpeedFix Auto Care
    3200.00,
    'USD',
    1,
    'active',
    NOW() - INTERVAL '40 minutes',
    '{
        "ui_status": "new",
        "parts": 1700,
        "labour": 1200,
        "consumables": 200,
        "gst": 100,
        "availability": "Today, 7:30 PM",
        "pickup_drop": "Available",
        "warranty": "2 Years / 20,000 km",
        "experience": "10+ Years",
        "savings": 150,
        "tag": "Free pickup & drop",
        "image": "/assets/garage_1_1778071156220.png"
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000044',
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000014', -- Five Star Automotive
    3600.00,
    'USD',
    2,
    'active',
    NOW() - INTERVAL '1 hour',
    '{
        "ui_status": "viewed",
        "parts": 2000,
        "labour": 1300,
        "consumables": 200,
        "gst": 100,
        "availability": "Tomorrow, 1:00 PM",
        "pickup_drop": "Available",
        "warranty": "6 Months / 8,000 km",
        "experience": "7+ Years",
        "savings": 0,
        "image": "/assets/garage_4_1778071611328.png"
     }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000045',
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000015', -- Metro Auto Bay
    3280.00,
    'USD',
    1,
    'active',
    NOW() - INTERVAL '2 hours',
    '{
        "ui_status": "viewed",
        "parts": 1780,
        "labour": 1180,
        "consumables": 200,
        "gst": 120,
        "availability": "Today, 5:30 PM",
        "pickup_drop": "Available",
        "warranty": "1 Year / 15,000 km",
        "experience": "9+ Years",
        "savings": 200,
        "image": "/assets/garage_5_1778071628253.png"
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000046',
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000018', -- Prime Service Point
    3520.00,
    'USD',
    2,
    'active',
    NOW() - INTERVAL '1 day',
    '{
        "ui_status": "expired",
        "parts": 1880,
        "labour": 1240,
        "consumables": 220,
        "gst": 180,
        "availability": "Tomorrow, 11:30 AM",
        "pickup_drop": "Available",
        "warranty": "6 Months / 10,000 km",
        "experience": "8+ Years",
        "savings": 80,
        "image": "/assets/garage_1_1778071156220.png"
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000047',
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000016', -- Royal Motor Service
    3250.00,
    'USD',
    1,
    'active',
    NOW() - INTERVAL '3 hours',
    '{
        "ui_status": "open",
        "parts": 1760,
        "labour": 1170,
        "consumables": 180,
        "gst": 140,
        "availability": "Today, 8:00 PM",
        "pickup_drop": "Available",
        "warranty": "3 Months / 7,500 km",
        "experience": "5+ Years",
        "savings": 150,
        "image": "/assets/garage_2_1778071173295.png"
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000048',
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000017', -- PitStop Car Care
    3180.00,
    'USD',
    2,
    'active',
    NOW() - INTERVAL '5 hours',
    '{
        "ui_status": "open",
        "parts": 1720,
        "labour": 1160,
        "consumables": 200,
        "gst": 100,
        "availability": "Tomorrow, 9:30 AM",
        "pickup_drop": "Not Available",
        "warranty": "6 Months / 8,000 km",
        "experience": "6+ Years",
        "savings": 220,
        "image": "/assets/garage_3_1778071191282.png"
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
