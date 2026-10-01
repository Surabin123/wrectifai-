BEGIN;

-- The active vehicle lookup is used both by the trigger and booking creation.
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_active_service
  ON bookings (vehicle_id, customer_id)
  WHERE status IN ('in_progress', 'readyForCollection');

CREATE OR REPLACE FUNCTION prevent_duplicate_vehicle_booking_day()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  booking_day date;
BEGIN
  -- Completed is a closed job; a later transition to readyForCollection
  -- reopens the vehicle hold until the customer confirms collection.
  IF NEW.status NOT IN ('cancelled', 'completed', 'collected') THEN
    -- Lock on the vehicle, not the requested date, so concurrent requests for
    -- different times/days cannot both pass the active-job check.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.vehicle_id::text, 0));

    IF EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.vehicle_id = NEW.vehicle_id
        AND b.customer_id = NEW.customer_id
        AND b.status IN ('in_progress', 'readyForCollection')
        AND b.id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'This vehicle already has an active service booking.'
        USING ERRCODE = '23505', CONSTRAINT = 'uq_active_vehicle_service';
    END IF;

    -- Keep the existing local-calendar-day appointment rule for open bookings.
    IF NEW.status IN ('requested', 'confirmed', 'in_progress', 'readyForCollection') THEN
      booking_day := (NEW.scheduled_at AT TIME ZONE 'Asia/Kolkata')::date;
      IF EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.vehicle_id = NEW.vehicle_id
          AND b.customer_id = NEW.customer_id
          AND b.status IN ('requested', 'confirmed', 'in_progress', 'readyForCollection')
          AND (b.scheduled_at AT TIME ZONE 'Asia/Kolkata')::date = booking_day
          AND b.id <> NEW.id
      ) THEN
        RAISE EXCEPTION 'This vehicle already has a booking for this date. Please select another date.'
          USING ERRCODE = '23505', CONSTRAINT = 'uq_active_vehicle_booking_local_day';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_vehicle_booking_day ON bookings;
CREATE TRIGGER trg_prevent_duplicate_vehicle_booking_day
  BEFORE INSERT OR UPDATE OF vehicle_id, customer_id, scheduled_at, status ON bookings
  FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_vehicle_booking_day();

COMMIT;
