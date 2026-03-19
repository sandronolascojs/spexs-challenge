CREATE TYPE "public"."alert_event_status" AS ENUM('OPEN', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."comparison_operator" AS ENUM('gt', 'lt', 'gte', 'lte', 'eq');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('pending', 'running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."node_execution_status" AS ENUM('pending', 'running', 'success', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('manual_trigger', 'trigger_threshold', 'trigger_variance', 'output_message', 'recipient_email', 'recipient_in_app');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"from_node_id" text NOT NULL,
	"to_node_id" text NOT NULL,
	"from_output" text DEFAULT 'main' NOT NULL,
	"to_input" text DEFAULT 'main' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"type" "node_type" NOT NULL,
	"name" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"status" "execution_status" DEFAULT 'pending' NOT NULL,
	"triggered_by" text NOT NULL,
	"trigger_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"output" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"execution_id" text NOT NULL,
	"node_id" text NOT NULL,
	"status" "node_execution_status" DEFAULT 'pending' NOT NULL,
	"input_data" jsonb,
	"output_data" jsonb,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"status" "alert_event_status" DEFAULT 'OPEN' NOT NULL,
	"trigger_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"step_logs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"execution_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_execution_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"node_execution_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_connections" ADD CONSTRAINT "workflow_connections_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_connections" ADD CONSTRAINT "workflow_connections_from_node_id_workflow_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."workflow_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_connections" ADD CONSTRAINT "workflow_connections_to_node_id_workflow_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."workflow_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_nodes" ADD CONSTRAINT "workflow_nodes_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_executions" ADD CONSTRAINT "node_executions_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_executions" ADD CONSTRAINT "node_executions_node_id_workflow_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."workflow_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_event_id_alert_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."alert_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_execution_comments" ADD CONSTRAINT "node_execution_comments_node_execution_id_node_executions_id_fk" FOREIGN KEY ("node_execution_id") REFERENCES "public"."node_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_execution_comments" ADD CONSTRAINT "node_execution_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_idx" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "workflow_connections_workflow_id_idx" ON "workflow_connections" USING btree ("workflow_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_connections_unique_idx" ON "workflow_connections" USING btree ("from_node_id","to_node_id","from_output","to_input");--> statement-breakpoint
CREATE INDEX "workflow_nodes_workflow_id_idx" ON "workflow_nodes" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_nodes_type_idx" ON "workflow_nodes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "workflows_created_by_idx" ON "workflows" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "workflows_is_active_idx" ON "workflows" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "executions_workflow_id_idx" ON "executions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "executions_status_idx" ON "executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "executions_triggered_by_idx" ON "executions" USING btree ("triggered_by");--> statement-breakpoint
CREATE INDEX "node_executions_execution_id_idx" ON "node_executions" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "node_executions_node_id_idx" ON "node_executions" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "node_executions_status_idx" ON "node_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "alert_events_workflow_id_idx" ON "alert_events" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "alert_events_status_idx" ON "alert_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "alert_events_execution_id_idx" ON "alert_events" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "event_comments_event_id_idx" ON "event_comments" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_comments_user_id_idx" ON "event_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "node_execution_comments_node_execution_id_idx" ON "node_execution_comments" USING btree ("node_execution_id");--> statement-breakpoint
CREATE INDEX "node_execution_comments_user_id_idx" ON "node_execution_comments" USING btree ("user_id");