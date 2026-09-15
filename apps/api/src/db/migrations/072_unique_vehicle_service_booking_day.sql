BEGIN;

-- Preserve cancelled history, while preventing two service bookings for the
-- same customer vehicle on the same local calendar day. The vehicle FK and
-- booking customer ownership validation are enforced by the API.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_vehicle_booking_local_day
  ON bookings (vehicle_id, ((scheduled_at AT TIME ZONE 'Asia/Kolkata')::date))
  WHERE status <> 'cancelled';

COMMIT;
