ALTER TABLE "alert_events" ADD COLUMN "execution_id" text;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_events_execution_id_idx" ON "alert_events" USING btree ("execution_id");