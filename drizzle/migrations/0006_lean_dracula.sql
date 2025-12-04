CREATE TABLE "conveyor_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"source_types" jsonb DEFAULT '["news"]'::jsonb NOT NULL,
	"source_ids" jsonb,
	"keywords" jsonb,
	"exclude_keywords" jsonb,
	"max_age_days" integer DEFAULT 7 NOT NULL,
	"min_score_threshold" integer DEFAULT 70 NOT NULL,
	"daily_limit" integer DEFAULT 10 NOT NULL,
	"items_processed_today" integer DEFAULT 0 NOT NULL,
	"last_reset_at" timestamp DEFAULT now() NOT NULL,
	"monthly_budget_limit" numeric(10, 2) DEFAULT '10.00' NOT NULL,
	"current_month_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"budget_reset_at" timestamp DEFAULT now() NOT NULL,
	"learned_threshold" integer,
	"rejection_patterns" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"avoided_topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_formats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_processed" integer DEFAULT 0 NOT NULL,
	"total_passed" integer DEFAULT 0 NOT NULL,
	"total_failed" integer DEFAULT 0 NOT NULL,
	"total_approved" integer DEFAULT 0 NOT NULL,
	"total_rejected" integer DEFAULT 0 NOT NULL,
	"approval_rate" numeric(5, 4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conveyor_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "conveyor_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"source_type" varchar(20) NOT NULL,
	"source_item_id" varchar NOT NULL,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"current_stage" integer DEFAULT 1 NOT NULL,
	"source_data" jsonb,
	"scoring_data" jsonb,
	"analysis_data" jsonb,
	"architecture_data" jsonb,
	"script_data" jsonb,
	"qc_data" jsonb,
	"optimization_data" jsonb,
	"gate_data" jsonb,
	"stage_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revision_context" jsonb,
	"parent_item_id" varchar,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"total_processing_ms" integer,
	"total_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"error_stage" integer,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_scripts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"conveyor_item_id" varchar NOT NULL,
	"source_type" varchar(20) NOT NULL,
	"source_item_id" varchar NOT NULL,
	"title" text NOT NULL,
	"scenes" jsonb NOT NULL,
	"full_script" text NOT NULL,
	"format_id" varchar(50) NOT NULL,
	"format_name" varchar(100) NOT NULL,
	"estimated_duration" integer,
	"initial_score" integer,
	"final_score" integer NOT NULL,
	"hook_score" integer,
	"structure_score" integer,
	"emotional_score" integer,
	"cta_score" integer,
	"gate_decision" varchar(20) NOT NULL,
	"gate_confidence" numeric(3, 2),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"rejection_category" varchar(50),
	"revision_notes" text,
	"revision_count" integer DEFAULT 0 NOT NULL,
	"project_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "conveyor_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"conveyor_item_id" varchar,
	"event_type" varchar(50) NOT NULL,
	"stage_number" integer,
	"agent_name" varchar(50),
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conveyor_settings" ADD CONSTRAINT "conveyor_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conveyor_items" ADD CONSTRAINT "conveyor_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_scripts" ADD CONSTRAINT "auto_scripts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_scripts" ADD CONSTRAINT "auto_scripts_conveyor_item_id_conveyor_items_id_fk" FOREIGN KEY ("conveyor_item_id") REFERENCES "public"."conveyor_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_scripts" ADD CONSTRAINT "auto_scripts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conveyor_logs" ADD CONSTRAINT "conveyor_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conveyor_logs" ADD CONSTRAINT "conveyor_logs_conveyor_item_id_conveyor_items_id_fk" FOREIGN KEY ("conveyor_item_id") REFERENCES "public"."conveyor_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conveyor_settings_user_id_idx" ON "conveyor_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conveyor_items_user_id_idx" ON "conveyor_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conveyor_items_status_idx" ON "conveyor_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conveyor_items_source_idx" ON "conveyor_items" USING btree ("source_type","source_item_id");--> statement-breakpoint
CREATE INDEX "conveyor_items_started_at_idx" ON "conveyor_items" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "auto_scripts_user_id_idx" ON "auto_scripts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auto_scripts_status_idx" ON "auto_scripts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "auto_scripts_user_status_idx" ON "auto_scripts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "auto_scripts_created_at_idx" ON "auto_scripts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conveyor_logs_user_id_idx" ON "conveyor_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conveyor_logs_item_id_idx" ON "conveyor_logs" USING btree ("conveyor_item_id");--> statement-breakpoint
CREATE INDEX "conveyor_logs_event_type_idx" ON "conveyor_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "conveyor_logs_created_at_idx" ON "conveyor_logs" USING btree ("created_at");