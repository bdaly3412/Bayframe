-- Custom SQL migration file, put your code below! --
SET search_path = app, public;
--> statement-breakpoint
CREATE FUNCTION app.valid_slot(workshop uuid, starts timestamptz, ends timestamptz) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT isfinite(starts) AND isfinite(ends) AND ends=starts+interval '60 minutes'
   AND extract(isodow FROM starts AT TIME ZONE w.timezone) BETWEEN 1 AND 5
   AND (starts AT TIME ZONE w.timezone)::date=(ends AT TIME ZONE w.timezone)::date
   AND (starts AT TIME ZONE w.timezone)::time >= time '09:00'
   AND (ends AT TIME ZONE w.timezone)::time <= time '17:00'
 FROM app.workshops w WHERE w.id=workshop
$$;
--> statement-breakpoint
ALTER TABLE app.allocations ADD CONSTRAINT allocation_overlap EXCLUDE USING gist (resource_id WITH =, tstzrange(start_at,end_at,'[)') WITH &&) WHERE (released_at IS NULL);
CREATE UNIQUE INDEX allocation_kind_active ON app.allocations(booking_id,kind) WHERE released_at IS NULL;
CREATE INDEX booking_schedule ON app.bookings(workshop_id,start_at);
CREATE INDEX allocation_resource ON app.allocations(resource_id,start_at) WHERE released_at IS NULL;
CREATE INDEX absence_resource ON app.absences(resource_id,start_at);
--> statement-breakpoint
CREATE FUNCTION app.guard_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r app.resources; b app.bookings;
BEGIN
 IF TG_OP='UPDATE' THEN
   IF (to_jsonb(NEW)-'released_at') IS DISTINCT FROM (to_jsonb(OLD)-'released_at') OR OLD.released_at IS NOT NULL THEN
     RAISE EXCEPTION 'Allocation history is immutable' USING ERRCODE='23514';
   END IF;
   RETURN NEW;
 END IF;
 SELECT * INTO r FROM app.resources WHERE id=NEW.resource_id AND workshop_id=NEW.workshop_id FOR UPDATE;
 SELECT * INTO b FROM app.bookings WHERE id=NEW.booking_id AND workshop_id=NEW.workshop_id;
 IF NEW.released_at IS NOT NULL OR NOT r.active OR r.type<>NEW.kind OR b.state NOT IN ('requested','confirmed')
   OR NEW.start_at<>b.start_at OR NEW.end_at<>b.end_at OR NOT app.valid_slot(NEW.workshop_id,NEW.start_at,NEW.end_at)
   OR (r.type='technician' AND NOT EXISTS(SELECT 1 FROM app.staff s WHERE s.id=r.staff_id AND s.workshop_id=r.workshop_id AND s.active))
   OR EXISTS(SELECT 1 FROM app.absences a WHERE a.resource_id=r.id AND tstzrange(a.start_at,a.end_at,'[)') && tstzrange(NEW.start_at,NEW.end_at,'[)')) THEN
   RAISE EXCEPTION 'Resource not eligible for allocation' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER allocation_guard BEFORE INSERT OR UPDATE ON app.allocations FOR EACH ROW EXECUTE FUNCTION app.guard_allocation();
--> statement-breakpoint
CREATE FUNCTION app.guard_absence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM app.resources WHERE id=NEW.resource_id AND workshop_id=NEW.workshop_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM app.allocations a WHERE a.resource_id=NEW.resource_id AND a.released_at IS NULL AND tstzrange(a.start_at,a.end_at,'[)') && tstzrange(NEW.start_at,NEW.end_at,'[)')) THEN
   RAISE EXCEPTION 'Absence conflicts with a reservation' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER absence_guard BEFORE INSERT ON app.absences FOR EACH ROW EXECUTE FUNCTION app.guard_absence();
--> statement-breakpoint
CREATE FUNCTION app.check_booking_allocations() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE booking uuid; b app.bookings; expected integer; actual integer;
BEGIN
 IF TG_TABLE_NAME='bookings' THEN booking=NEW.id; ELSE booking=NEW.booking_id; END IF;
 SELECT * INTO b FROM app.bookings WHERE id=booking;
 expected=CASE WHEN b.state IN ('confirmed','checked-in') AND NOT EXISTS(SELECT 1 FROM app.work_orders w WHERE w.booking_id=b.id AND w.state='closed') THEN 2 ELSE 0 END;
 SELECT count(*) INTO actual FROM app.allocations a WHERE a.booking_id=b.id AND a.released_at IS NULL;
 IF actual<>expected OR EXISTS(SELECT 1 FROM app.allocations a WHERE a.booking_id=b.id AND a.released_at IS NULL AND (a.start_at<>b.start_at OR a.end_at<>b.end_at)) THEN
   RAISE EXCEPTION 'Booking and allocation state disagree' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER booking_allocations AFTER INSERT OR UPDATE ON app.bookings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_booking_allocations();
CREATE CONSTRAINT TRIGGER allocation_booking AFTER INSERT OR UPDATE ON app.allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_booking_allocations();
CREATE CONSTRAINT TRIGGER work_booking AFTER UPDATE ON app.work_orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_booking_allocations();
--> statement-breakpoint
CREATE FUNCTION app.guard_estimate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.state<>'draft' AND (to_jsonb(NEW)-'state') IS DISTINCT FROM (to_jsonb(OLD)-'state') THEN
   RAISE EXCEPTION 'Issued estimate snapshot is immutable' USING ERRCODE='23514';
 END IF;
 IF NEW.state<>OLD.state AND NOT ((OLD.state='draft' AND NEW.state='issued') OR (OLD.state='issued' AND NEW.state IN ('accepted','rejected','expired','superseded'))) THEN
   RAISE EXCEPTION 'Invalid estimate transition' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER estimate_guard BEFORE UPDATE ON app.estimates FOR EACH ROW EXECUTE FUNCTION app.guard_estimate();
--> statement-breakpoint
CREATE FUNCTION app.guard_estimate_line() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; current_state text;
BEGIN
 IF TG_OP='DELETE' THEN target=OLD.estimate_id; ELSE target=NEW.estimate_id; END IF;
 IF TG_OP='UPDATE' AND (NEW.estimate_id<>OLD.estimate_id OR NEW.workshop_id<>OLD.workshop_id) THEN
   RAISE EXCEPTION 'Line ownership is immutable' USING ERRCODE='23514';
 END IF;
 SELECT state INTO current_state FROM app.estimates WHERE id=target FOR UPDATE;
 IF current_state IS DISTINCT FROM 'draft' THEN RAISE EXCEPTION 'Issued estimate lines are immutable' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER estimate_line_guard BEFORE INSERT OR UPDATE OR DELETE ON app.estimate_lines FOR EACH ROW EXECUTE FUNCTION app.guard_estimate_line();
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.valid_slot(uuid,timestamptz,timestamptz) TO bayframe_runtime;
GRANT SELECT, INSERT ON app.customers,app.vehicles,app.bookings,app.allocations,app.absences,app.work_orders,app.tasks,app.estimates,app.estimate_lines,app.decisions,app.audit_events TO bayframe_runtime;
GRANT UPDATE (state,start_at,end_at) ON app.bookings TO bayframe_runtime;
GRANT UPDATE (released_at) ON app.allocations TO bayframe_runtime;
GRANT UPDATE (state) ON app.work_orders TO bayframe_runtime;
GRANT UPDATE (done) ON app.tasks TO bayframe_runtime;
GRANT UPDATE (state,token_hash,expires_at,issued_at) ON app.estimates TO bayframe_runtime;
RESET search_path;
