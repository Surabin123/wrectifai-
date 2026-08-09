-- Seed dummy user with phone number '1234567890'
INSERT INTO users (id, mobile_number, name, status)
VALUES ('00000000-0000-0000-0000-000000000001', '1234567890', 'Test User', 'active')
ON CONFLICT (mobile_number) DO NOTHING;

-- Map user to the 'customer' role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.mobile_number = '1234567890' AND r.code = 'customer'
ON CONFLICT DO NOTHING;

-- Seed dummy vehicle (Honda City) for this user
INSERT INTO vehicles (id, customer_id, make, model, year, vin, mileage)
SELECT '00000000-0000-0000-0000-000000000002', u.id, 'Honda', 'City', 2018, '1HGCR2F8XJA000001', 45000
FROM users u
WHERE u.mobile_number = '1234567890'
ON CONFLICT (vin) DO NOTHING;

-- Seed dummy service history for this vehicle
INSERT INTO vehicle_service_history (vehicle_id, service_date, description, cost)
SELECT v.id, NOW() - INTERVAL '3 months', 'Routine Engine Oil & Filter Change', 85.00
FROM vehicles v
WHERE v.vin = '1HGCR2F8XJA000001'
ON CONFLICT DO NOTHING;
