CREATE TABLE "alert_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"trigger_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "events" CASCADE;--> statement-breakpoint

ALTER TABLE "event_comments" DROP CONSTRAINT "event_comments_author_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "event_comments_author_id_idx";--> statement-breakpoint
ALTER TABLE "event_comments" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "event_comments" ADD COLUMN "content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_events_workflow_id_idx" ON "alert_events" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "alert_events_status_idx" ON "alert_events" USING btree ("status");--> statement-breakpoint
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_event_id_alert_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."alert_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_comments_user_id_idx" ON "event_comments" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "event_comments" DROP COLUMN "author_id";--> statement-breakpoint
ALTER TABLE "event_comments" DROP COLUMN "comment";--> statement-breakpoint
DROP TYPE "public"."event_status";--> statement-breakpoint
DROP TYPE "public"."notification_channel";--> statement-breakpoint
DROP TYPE "public"."trigger_type";