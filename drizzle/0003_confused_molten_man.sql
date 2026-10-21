CREATE TABLE "app"."absences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	CONSTRAINT "absence_interval_check" CHECK (isfinite("app"."absences"."start_at") AND isfinite("app"."absences"."end_at") AND "app"."absences"."start_at" < "app"."absences"."end_at")
);
--> statement-breakpoint
CREATE TABLE "app"."allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	CONSTRAINT "allocation_interval_check" CHECK (isfinite("app"."allocations"."start_at") AND isfinite("app"."allocations"."end_at") AND "app"."allocations"."start_at" < "app"."allocations"."end_at"),
	CONSTRAINT "allocation_kind_check" CHECK ("app"."allocations"."kind" IN ('bay','technician'))
);
--> statement-breakpoint
CREATE TABLE "app"."audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"booking_id" uuid,
	"work_order_id" uuid,
	"estimate_id" uuid,
	"actor_id" uuid,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_reference_check" CHECK (num_nonnulls("app"."audit_events"."booking_id","app"."audit_events"."work_order_id","app"."audit_events"."estimate_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "app"."bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"state" text DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_scope_key" UNIQUE("workshop_id","id"),
	CONSTRAINT "booking_interval_check" CHECK (isfinite("app"."bookings"."start_at") AND isfinite("app"."bookings"."end_at") AND "app"."bookings"."end_at" = "app"."bookings"."start_at" + interval '60 minutes'),
	CONSTRAINT "booking_state_check" CHECK ("app"."bookings"."state" IN ('requested','confirmed','rejected','cancelled','checked-in'))
);
--> statement-breakpoint
CREATE TABLE "app"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "customers_scope_key" UNIQUE("workshop_id","id"),
	CONSTRAINT "customer_text_check" CHECK (length(btrim("app"."customers"."name")) BETWEEN 1 AND 120 AND length("app"."customers"."email") BETWEEN 3 AND 254)
);
--> statement-breakpoint
CREATE TABLE "app"."decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"estimate_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decisions_estimate_id_unique" UNIQUE("estimate_id"),
	CONSTRAINT "decision_check" CHECK ("app"."decisions"."decision" IN ('accepted','rejected'))
);
--> statement-breakpoint
CREATE TABLE "app"."estimate_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"estimate_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	CONSTRAINT "line_values_check" CHECK (length(btrim("app"."estimate_lines"."description")) BETWEEN 1 AND 500 AND "app"."estimate_lines"."quantity" BETWEEN 1 AND 1000 AND "app"."estimate_lines"."unit_price" BETWEEN 0 AND 1000000)
);
--> statement-breakpoint
CREATE TABLE "app"."estimates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"work_order_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"net" integer NOT NULL,
	"tax" integer NOT NULL,
	"total" integer NOT NULL,
	"token_hash" text,
	"expires_at" timestamp with time zone,
	"issued_at" timestamp with time zone,
	CONSTRAINT "estimate_version_key" UNIQUE("work_order_id","version"),
	CONSTRAINT "estimate_scope_key" UNIQUE("workshop_id","id"),
	CONSTRAINT "estimate_token_key" UNIQUE("token_hash"),
	CONSTRAINT "estimate_money_check" CHECK ("app"."estimates"."version" > 0 AND "app"."estimates"."currency"='GBP' AND "app"."estimates"."net" BETWEEN 0 AND 100000000 AND "app"."estimates"."tax" BETWEEN 0 AND 20000000 AND "app"."estimates"."total"="app"."estimates"."net"+"app"."estimates"."tax"),
	CONSTRAINT "estimate_state_check" CHECK ("app"."estimates"."state" IN ('draft','issued','accepted','rejected','expired','superseded')),
	CONSTRAINT "estimate_issue_check" CHECK ("app"."estimates"."state"='draft' OR ("app"."estimates"."token_hash" ~ '^[a-f0-9]{64}$' AND "app"."estimates"."expires_at" IS NOT NULL AND "app"."estimates"."issued_at" IS NOT NULL AND isfinite("app"."estimates"."expires_at") AND "app"."estimates"."expires_at">"app"."estimates"."issued_at"))
);
--> statement-breakpoint
CREATE TABLE "app"."tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"work_order_id" uuid NOT NULL,
	"description" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	CONSTRAINT "task_description_check" CHECK (length(btrim("app"."tasks"."description")) BETWEEN 1 AND 500)
);
--> statement-breakpoint
CREATE TABLE "app"."vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"registration" text NOT NULL,
	CONSTRAINT "vehicles_scope_key" UNIQUE("workshop_id","id","customer_id"),
	CONSTRAINT "registration_check" CHECK (length(btrim("app"."vehicles"."registration")) BETWEEN 1 AND 20)
);
--> statement-breakpoint
CREATE TABLE "app"."work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"technician_id" uuid NOT NULL,
	"state" text DEFAULT 'ready' NOT NULL,
	CONSTRAINT "work_orders_booking_id_unique" UNIQUE("booking_id"),
	CONSTRAINT "work_orders_scope_key" UNIQUE("workshop_id","id"),
	CONSTRAINT "work_order_state_check" CHECK ("app"."work_orders"."state" IN ('ready','in-progress','awaiting-approval','completed','closed'))
);
--> statement-breakpoint
ALTER TABLE "app"."absences" ADD CONSTRAINT "absences_workshop_id_resource_id_resources_workshop_id_id_fk" FOREIGN KEY ("workshop_id","resource_id") REFERENCES "app"."resources"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."allocations" ADD CONSTRAINT "allocations_workshop_id_booking_id_bookings_workshop_id_id_fk" FOREIGN KEY ("workshop_id","booking_id") REFERENCES "app"."bookings"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."allocations" ADD CONSTRAINT "allocations_workshop_id_resource_id_resources_workshop_id_id_fk" FOREIGN KEY ("workshop_id","resource_id") REFERENCES "app"."resources"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."audit_events" ADD CONSTRAINT "audit_events_workshop_id_booking_id_bookings_workshop_id_id_fk" FOREIGN KEY ("workshop_id","booking_id") REFERENCES "app"."bookings"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."audit_events" ADD CONSTRAINT "audit_events_workshop_id_work_order_id_work_orders_workshop_id_id_fk" FOREIGN KEY ("workshop_id","work_order_id") REFERENCES "app"."work_orders"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."audit_events" ADD CONSTRAINT "audit_events_workshop_id_estimate_id_estimates_workshop_id_id_fk" FOREIGN KEY ("workshop_id","estimate_id") REFERENCES "app"."estimates"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."audit_events" ADD CONSTRAINT "audit_events_workshop_id_actor_id_staff_workshop_id_id_fk" FOREIGN KEY ("workshop_id","actor_id") REFERENCES "app"."staff"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."bookings" ADD CONSTRAINT "bookings_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "app"."workshops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."bookings" ADD CONSTRAINT "bookings_workshop_id_vehicle_id_customer_id_vehicles_workshop_id_id_customer_id_fk" FOREIGN KEY ("workshop_id","vehicle_id","customer_id") REFERENCES "app"."vehicles"("workshop_id","id","customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "app"."workshops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."decisions" ADD CONSTRAINT "decisions_workshop_id_estimate_id_estimates_workshop_id_id_fk" FOREIGN KEY ("workshop_id","estimate_id") REFERENCES "app"."estimates"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."estimate_lines" ADD CONSTRAINT "estimate_lines_workshop_id_estimate_id_estimates_workshop_id_id_fk" FOREIGN KEY ("workshop_id","estimate_id") REFERENCES "app"."estimates"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."estimates" ADD CONSTRAINT "estimates_workshop_id_work_order_id_work_orders_workshop_id_id_fk" FOREIGN KEY ("workshop_id","work_order_id") REFERENCES "app"."work_orders"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tasks" ADD CONSTRAINT "tasks_workshop_id_work_order_id_work_orders_workshop_id_id_fk" FOREIGN KEY ("workshop_id","work_order_id") REFERENCES "app"."work_orders"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."vehicles" ADD CONSTRAINT "vehicles_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "app"."workshops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."vehicles" ADD CONSTRAINT "vehicles_workshop_id_customer_id_customers_workshop_id_id_fk" FOREIGN KEY ("workshop_id","customer_id") REFERENCES "app"."customers"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."work_orders" ADD CONSTRAINT "work_orders_workshop_id_booking_id_bookings_workshop_id_id_fk" FOREIGN KEY ("workshop_id","booking_id") REFERENCES "app"."bookings"("workshop_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."work_orders" ADD CONSTRAINT "work_orders_workshop_id_technician_id_staff_workshop_id_id_fk" FOREIGN KEY ("workshop_id","technician_id") REFERENCES "app"."staff"("workshop_id","id") ON DELETE no action ON UPDATE no action;