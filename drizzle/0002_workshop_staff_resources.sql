CREATE TABLE "app"."resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"staff_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "resources_workshop_id_key" UNIQUE("workshop_id","id"),
	CONSTRAINT "resources_workshop_type_name_key" UNIQUE("workshop_id","type","name"),
	CONSTRAINT "resources_workshop_staff_key" UNIQUE("workshop_id","staff_id"),
	CONSTRAINT "resources_type_check" CHECK ("app"."resources"."type" IN ('bay', 'technician')),
	CONSTRAINT "resources_staff_type_check" CHECK ("app"."resources"."staff_id" IS NULL OR "app"."resources"."type" = 'technician'),
	CONSTRAINT "resources_name_check" CHECK ("app"."resources"."name" = btrim("app"."resources"."name") AND length("app"."resources"."name") > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "staff_workshop_user_key" UNIQUE("workshop_id","auth_user_id"),
	CONSTRAINT "staff_workshop_id_key" UNIQUE("workshop_id","id"),
	CONSTRAINT "staff_role_check" CHECK ("app"."staff"."role" IN ('manager', 'adviser', 'technician'))
);
--> statement-breakpoint
CREATE TABLE "app"."workshops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	CONSTRAINT "workshops_name_check" CHECK ("app"."workshops"."name" = btrim("app"."workshops"."name") AND length("app"."workshops"."name") > 0),
	CONSTRAINT "workshops_timezone_check" CHECK (app.valid_timezone("app"."workshops"."timezone"))
);
--> statement-breakpoint
ALTER TABLE "app"."resources" ADD CONSTRAINT "resources_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "app"."workshops"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "app"."resources" ADD CONSTRAINT "resources_workshop_staff_fk" FOREIGN KEY ("workshop_id","staff_id") REFERENCES "app"."staff"("workshop_id","id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "app"."staff" ADD CONSTRAINT "staff_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "app"."workshops"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "app"."staff" ADD CONSTRAINT "staff_auth_user_id_users_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
GRANT SELECT ON app.workshops, app.staff, app.resources TO bayframe_runtime;
