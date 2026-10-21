-- PostgreSQL row locks require UPDATE privilege; the trigger denies identity changes.
GRANT UPDATE (id) ON app.staff,app.resources TO bayframe_runtime;
--> statement-breakpoint
CREATE FUNCTION app.preserve_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id<>OLD.id THEN RAISE EXCEPTION 'Identity is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_identity BEFORE UPDATE ON app.staff FOR EACH ROW EXECUTE FUNCTION app.preserve_identity();
CREATE TRIGGER resource_identity BEFORE UPDATE ON app.resources FOR EACH ROW EXECUTE FUNCTION app.preserve_identity();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.guard_estimate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.state<>'draft' THEN RAISE EXCEPTION 'New estimate must be a draft' USING ERRCODE='23514'; END IF;
   RETURN NEW;
 END IF;
 IF OLD.state<>'draft' AND (to_jsonb(NEW)-'state') IS DISTINCT FROM (to_jsonb(OLD)-'state') THEN
   RAISE EXCEPTION 'Issued estimate snapshot is immutable' USING ERRCODE='23514';
 END IF;
 IF NEW.state<>OLD.state AND NOT ((OLD.state='draft' AND NEW.state='issued') OR (OLD.state='issued' AND NEW.state IN ('accepted','rejected','expired','superseded'))) THEN
   RAISE EXCEPTION 'Invalid estimate transition' USING ERRCODE='23514';
 END IF;
 IF NEW.state='issued' AND OLD.state='draft' AND NOT EXISTS (
   SELECT 1 FROM app.estimate_lines l WHERE l.estimate_id=NEW.id HAVING count(*)>0 AND sum(l.quantity::bigint*l.unit_price)=NEW.net
     AND sum((l.quantity::bigint*l.unit_price+2)/5)=NEW.tax
 ) THEN RAISE EXCEPTION 'Issued totals must match lines' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER estimate_guard ON app.estimates;
CREATE TRIGGER estimate_guard BEFORE INSERT OR UPDATE ON app.estimates FOR EACH ROW EXECUTE FUNCTION app.guard_estimate();
