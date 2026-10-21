CREATE FUNCTION app.valid_timezone(value text) RETURNS boolean
LANGUAGE sql STABLE STRICT SET search_path = pg_catalog
AS $$
  SELECT (value = 'UTC' OR (position('/' IN value) > 0
    AND value NOT LIKE 'posix/%' AND value NOT LIKE 'right/%'))
    AND EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = value)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.valid_timezone(text) FROM PUBLIC, anon, authenticated, service_role;
