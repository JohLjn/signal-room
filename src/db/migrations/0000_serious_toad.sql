CREATE TYPE "public"."activity_type" AS ENUM('incident_created', 'status_changed', 'severity_changed', 'owner_changed', 'comment_added');--> statement-breakpoint
CREATE TYPE "public"."incident_severity" AS ENUM('sev1', 'sev2', 'sev3', 'sev4');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('open', 'investigating', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TABLE "activity_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"comment_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_entries_comment_link_check" CHECK (("activity_entries"."type" = 'comment_added' AND "activity_entries"."comment_id" IS NOT NULL) OR ("activity_entries"."type" <> 'comment_added' AND "activity_entries"."comment_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_workspace_incident_id_unique" UNIQUE("workspace_id","incident_id","id"),
	CONSTRAINT "comments_body_not_empty" CHECK (length(btrim("comments"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "incident_status" NOT NULL,
	"severity" "incident_severity" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incidents_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "incidents_title_not_empty" CHECK (length(btrim("incidents"."title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_normalized" CHECK ("users"."email" = lower("users"."email")),
	CONSTRAINT "users_email_not_empty" CHECK (length("users"."email") > 0),
	CONSTRAINT "users_name_not_empty" CHECK (length(btrim("users"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_memberships_pkey" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug"),
	CONSTRAINT "workspaces_slug_normalized" CHECK ("workspaces"."slug" = lower("workspaces"."slug")),
	CONSTRAINT "workspaces_slug_not_empty" CHECK (length("workspaces"."slug") > 0),
	CONSTRAINT "workspaces_name_not_empty" CHECK (length(btrim("workspaces"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "activity_entries" ADD CONSTRAINT "activity_entries_incident_fkey" FOREIGN KEY ("workspace_id","incident_id") REFERENCES "public"."incidents"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_entries" ADD CONSTRAINT "activity_entries_actor_membership_fkey" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "public"."workspace_memberships"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_entries" ADD CONSTRAINT "activity_entries_comment_fkey" FOREIGN KEY ("workspace_id","incident_id","comment_id") REFERENCES "public"."comments"("workspace_id","incident_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_incident_fkey" FOREIGN KEY ("workspace_id","incident_id") REFERENCES "public"."incidents"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_membership_fkey" FOREIGN KEY ("workspace_id","author_id") REFERENCES "public"."workspace_memberships"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_creator_membership_fkey" FOREIGN KEY ("workspace_id","creator_id") REFERENCES "public"."workspace_memberships"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_owner_membership_fkey" FOREIGN KEY ("workspace_id","owner_id") REFERENCES "public"."workspace_memberships"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_entries_incident_created_at_id_idx" ON "activity_entries" USING btree ("incident_id","created_at","id");--> statement-breakpoint
CREATE INDEX "comments_incident_created_at_id_idx" ON "comments" USING btree ("incident_id","created_at","id");--> statement-breakpoint
CREATE INDEX "incidents_workspace_status_idx" ON "incidents" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "incidents_workspace_updated_at_idx" ON "incidents" USING btree ("workspace_id","updated_at");