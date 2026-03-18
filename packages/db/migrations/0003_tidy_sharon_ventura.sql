CREATE TABLE "node_execution_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"node_execution_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "node_execution_comments" ADD CONSTRAINT "node_execution_comments_node_execution_id_node_executions_id_fk" FOREIGN KEY ("node_execution_id") REFERENCES "public"."node_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_execution_comments" ADD CONSTRAINT "node_execution_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "node_execution_comments_node_execution_id_idx" ON "node_execution_comments" USING btree ("node_execution_id");--> statement-breakpoint
CREATE INDEX "node_execution_comments_user_id_idx" ON "node_execution_comments" USING btree ("user_id");