CREATE INDEX "executions_workflow_id_status_idx" ON "executions" USING btree ("workflow_id","status");--> statement-breakpoint
CREATE INDEX "executions_workflow_id_started_at_idx" ON "executions" USING btree ("workflow_id","started_at");--> statement-breakpoint
CREATE INDEX "alert_events_workflow_id_status_idx" ON "alert_events" USING btree ("workflow_id","status");