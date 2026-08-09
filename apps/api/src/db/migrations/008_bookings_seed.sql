-- Seed bookings table with sample records
INSERT INTO bookings (id, customer_id, garage_id, vehicle_id, booking_type, scheduled_at, status, total_amount, currency)
VALUES
  (
    '00000000-0000-0000-0000-000000000081',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011', -- QuickPit
    '00000000-0000-0000-0000-000000000002', -- Honda City
    'instant',
    NOW() + INTERVAL '2 days',
    'confirmed',
    150.00,
    'USD'
  ),
  (
    '00000000-0000-0000-0000-000000000082',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000013', -- AutoWorks
    '00000000-0000-0000-0000-000000000002', -- Honda City
    'quoteBased',
    NOW() - INTERVAL '1 day',
    'completed',
    3200.00,
    'USD'
  )
ON CONFLICT (id) DO NOTHING;
