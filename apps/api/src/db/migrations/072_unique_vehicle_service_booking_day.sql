BEGIN;

-- Do not add a unique index here: production may already contain historical
-- duplicates, which must be preserved. This trigger protects all new and
-- changed service bookings instead. The transaction advisory lock makes the
-- check safe when two requests arrive concurrently.
CREATE OR REPLACE FUNCTION prevent_duplicate_vehicle_booking_day()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  booking_day date;
BEGIN
  IF NEW.status <> 'cancelled' THEN
    booking_day := (NEW.scheduled_at AT TIME ZONE 'Asia/Kolkata')::date;
    PERFORM pg_advisory_xact_lock(
      hashtextextended(NEW.vehicle_id::text || ':' || booking_day::text, 0)
    );

    IF EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.vehicle_id = NEW.vehicle_id
        AND b.status <> 'cancelled'
        AND (b.scheduled_at AT TIME ZONE 'Asia/Kolkata')::date = booking_day
        AND b.id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'This vehicle already has a booking for this date. Please select another date.'
        USING ERRCODE = '23505', CONSTRAINT = 'uq_active_vehicle_booking_local_day';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_vehicle_booking_day ON bookings;
CREATE TRIGGER trg_prevent_duplicate_vehicle_booking_day
  BEFORE INSERT OR UPDATE OF vehicle_id, scheduled_at, status ON bookings
  FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_vehicle_booking_day();

COMMIT;
