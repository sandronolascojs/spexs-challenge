CREATE TYPE "public"."alert_event_status" AS ENUM('OPEN', 'RESOLVED');--> statement-breakpoint
ALTER TABLE "alert_events" ALTER COLUMN "status" SET DEFAULT 'OPEN'::"public"."alert_event_status";--> statement-breakpoint
ALTER TABLE "alert_events" ALTER COLUMN "status" SET DATA TYPE "public"."alert_event_status" USING "status"::"public"."alert_event_status";--> statement-breakpoint
ALTER TABLE "alert_events" ADD COLUMN "step_logs" jsonb DEFAULT '[]'::jsonb NOT NULL;