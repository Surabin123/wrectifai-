-- Create Promos Table
CREATE TABLE IF NOT EXISTS promos (
    id VARCHAR(100) PRIMARY KEY,
    badge VARCHAR(255),
    icon VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    bullets TEXT[],
    numeric_price NUMERIC(12, 2) NOT NULL,
    strike_price NUMERIC(12, 2),
    discount_percent INTEGER,
    valid_till TIMESTAMPTZ,
    used_count_value INTEGER DEFAULT 0,
    image TEXT,
    categories TEXT[],
    is_combo BOOLEAN DEFAULT false,
    relevance INTEGER DEFAULT 0,
    theme_preset VARCHAR(50) NOT NULL DEFAULT 'blue' CHECK (theme_preset IN ('orange', 'green', 'blue', 'purple', 'red')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Garage Owner user
INSERT INTO users (id, mobile_number, name, status)
VALUES ('00000000-0000-0000-0000-000000000003', '9999999999', 'Garage Owner', 'active')
ON CONFLICT (mobile_number) DO NOTHING;

-- Seed user role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.mobile_number = '9999999999' AND r.code = 'garage'
ON CONFLICT DO NOTHING;

-- Seed Garages
INSERT INTO garages (id, owner_user_id, name, address, location, specializations, certifications, pickup_drop_supported, approval_status, rating_avg, rating_count)
VALUES 
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000003', 'QuickPit Service Center', 'Madhapur, Hyderabad', '{"lat": 17.4483, "lng": 78.3741}', ARRAY['engine', 'brakes', 'Inspection', 'Pickup'], ARRAY['ISO 9001'], true, 'approved', 4.5, 96),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000003', 'SpeedFix Auto Care', 'Kondapur, Hyderabad', '{"lat": 17.4622, "lng": 78.3568}', ARRAY['engine', 'brakes', 'Warranty', 'Parts'], ARRAY['ASE Certified'], true, 'approved', 4.6, 128),
('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000003', 'AutoWorks Garage', 'Gachibowli, Hyderabad', '{"lat": 17.4401, "lng": 78.3489}', ARRAY['engine', 'brakes', 'Inspection'], ARRAY['Bosch Certified'], false, 'approved', 4.4, 110),
('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000003', 'Five Star Automotive', 'Banjara Hills, Hyderabad', '{"lat": 17.4156, "lng": 78.4347}', ARRAY['engine', 'EV', 'Warranty'], ARRAY['Manufacturer Approved'], true, 'approved', 4.3, 78),
('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000003', 'Metro Auto Bay', 'Hitech City, Hyderabad', '{"lat": 17.4435, "lng": 78.3772}', ARRAY['engine', 'brakes', 'Parts'], ARRAY['ISO 9001'], true, 'approved', 4.7, 142),
('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000003', 'Royal Motor Service', 'Jubilee Hills, Hyderabad', '{"lat": 17.4312, "lng": 78.4008}', ARRAY['engine', 'Inspection'], ARRAY['ASE Certified'], false, 'approved', 4.2, 64),
('00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000003', 'PitStop Car Care', 'Kukatpally, Hyderabad', '{"lat": 17.4948, "lng": 78.3996}', ARRAY['brakes', 'Parts'], ARRAY['Bosch Certified'], true, 'approved', 4.1, 58)
ON CONFLICT (id) DO NOTHING;

-- Seed Promos
INSERT INTO promos (id, badge, icon, title, bullets, numeric_price, strike_price, discount_percent, valid_till, used_count_value, image, categories, is_combo, relevance, theme_preset)
VALUES
('summer-care-combo', 'SUMMER CARE COMBO', 'Sun', 'Coolant + AC + Engine Oil Combo', ARRAY['Improves engine cooling', 'Enhances AC performance', 'Extends engine life'], 2999.00, 4500.00, 33, NOW() + INTERVAL '30 days', 1200, '/assets/summner_car.png', ARRAY['Car Care', 'Service', 'Combo Deals'], true, 99, 'orange'),
('monsoon-care-combo', 'MONSOON CARE COMBO', 'CloudRain', 'Wiper Blades + Tyres + Checkup Combo', ARRAY['Clear visibility in rain', 'Better grip on wet roads', 'Comprehensive vehicle check'], 1999.00, 3000.00, 33, NOW() + INTERVAL '45 days', 986, '/assets/monsooncare.png', ARRAY['Service', 'Tyres', 'Combo Deals'], true, 97, 'green'),
('winter-care-combo', 'WINTER CARE COMBO', 'Snowflake', 'Battery + Engine Oil + Coolant Combo', ARRAY['Reliable cold starts', 'Smooth engine performance', 'Prevents overheating'], 2499.00, 3800.00, 34, NOW() + INTERVAL '60 days', 642, '/assets/wintercombo.png', ARRAY['Batteries', 'Service', 'Combo Deals'], true, 95, 'blue'),
('festival-shine-combo', 'FESTIVAL SHINE COMBO', 'Sparkles', 'Foam Wash + Wax + Interior Dressing', ARRAY['Showroom shine', 'Protects paint', 'Deep clean interior'], 1799.00, 2600.00, 31, NOW() + INTERVAL '15 days', 852, 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=400&q=80', ARRAY['Car Care', 'Combo Deals'], true, 90, 'purple'),
('weekend-check-combo', 'WEEKEND CHECK COMBO', 'Settings', 'Brake Check + Battery Test + Fluid Top-up', ARRAY['Safety first', 'Peace of mind', 'Quick 30-min service'], 1499.00, 2200.00, 32, NOW() + INTERVAL '10 days', 431, '/assets/weekend_combo_1778071208387.png', ARRAY['Service', 'Combo Deals'], true, 85, 'green'),
('mega-car-wash-offer', 'MEGA CAR WASH OFFER', 'CarFront', 'Premium Wash + Interior Cleaning', ARRAY['Exterior foam wash', 'Vacuum cleaning', 'Dashboard polish'], 499.00, 699.00, 29, NOW() + INTERVAL '20 days', 2100, '/assets/mega car.png', ARRAY['Car Care'], false, 98, 'green'),
('brake-care-special', 'BRAKE CARE SPECIAL', 'Disc3', 'Brake Pads + Disc Inspection', ARRAY['Brake wear check', 'Pads replacement option', 'Noise issue diagnosis'], 1299.00, 1799.00, 28, NOW() + INTERVAL '25 days', 1500, '/assets/brake_disc_1778070670609.png', ARRAY['Service'], false, 96, 'red'),
('ac-service-offer', 'AC SERVICE OFFER', 'Snowflake', 'AC Checkup + Gas Top-up', ARRAY['Cooling effectiveness check', 'Filter cleaning', 'Gas level top-up'], 1199.00, 1599.00, 26, NOW() + INTERVAL '30 days', 1800, '/assets/ac_vent_1778070688367.png', ARRAY['Service'], false, 94, 'blue')
ON CONFLICT (id) DO NOTHING;
