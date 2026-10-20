CREATE SCHEMA app AUTHORIZATION bayframe_migrator;
--> statement-breakpoint
REVOKE ALL ON SCHEMA app FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
GRANT USAGE ON SCHEMA app TO bayframe_runtime;
--> statement-breakpoint
CREATE EXTENSION btree_gist WITH SCHEMA app;
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE bayframe_migrator REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE bayframe_migrator IN SCHEMA app REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE bayframe_migrator IN SCHEMA app REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;
