CREATE TABLE "scripts_library" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"scenes" jsonb NOT NULL,
	"full_text" text,
	"format" varchar(50),
	"duration_seconds" integer,
	"word_count" integer,
	"ai_score" integer,
	"ai_analysis" jsonb,
	"ai_recommendations" jsonb,
	"source_type" varchar(50),
	"source_id" varchar,
	"source_title" text,
	"source_url" text,
	"project_id" varchar,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_script_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"analyzed_at" timestamp,
	"tags" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "analytics_fetch_queue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analytics_id" varchar NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"apify_run_id" varchar(255),
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analytics_id" varchar NOT NULL,
	"views" integer,
	"likes" integer,
	"comments" integer,
	"shares" integer,
	"saves" integer,
	"reach" integer,
	"impressions" integer,
	"plays" integer,
	"watch_time_seconds" integer,
	"engagement_rate" numeric(5, 2),
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"platform" varchar(50) NOT NULL,
	"post_url" text NOT NULL,
	"post_id" varchar(255),
	"update_interval_hours" integer DEFAULT 6 NOT NULL,
	"tracking_days" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_fetched_at" timestamp,
	"next_fetch_at" timestamp,
	"tracking_ends_at" timestamp,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"last_error" text
);
--> statement-breakpoint
ALTER TABLE "scripts_library" ADD CONSTRAINT "scripts_library_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts_library" ADD CONSTRAINT "scripts_library_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts_library" ADD CONSTRAINT "scripts_library_parent_script_id_scripts_library_id_fk" FOREIGN KEY ("parent_script_id") REFERENCES "public"."scripts_library"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_fetch_queue" ADD CONSTRAINT "analytics_fetch_queue_analytics_id_post_analytics_id_fk" FOREIGN KEY ("analytics_id") REFERENCES "public"."post_analytics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_analytics_id_post_analytics_id_fk" FOREIGN KEY ("analytics_id") REFERENCES "public"."post_analytics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_analytics" ADD CONSTRAINT "post_analytics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_analytics" ADD CONSTRAINT "post_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scripts_library_user_id_idx" ON "scripts_library" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scripts_library_status_idx" ON "scripts_library" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scripts_library_source_idx" ON "scripts_library" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "scripts_library_project_idx" ON "scripts_library" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "analytics_queue_status_idx" ON "analytics_fetch_queue" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "analytics_queue_analytics_idx" ON "analytics_fetch_queue" USING btree ("analytics_id");--> statement-breakpoint
CREATE INDEX "analytics_snapshots_analytics_idx" ON "analytics_snapshots" USING btree ("analytics_id");--> statement-breakpoint
CREATE INDEX "analytics_snapshots_time_idx" ON "analytics_snapshots" USING btree ("analytics_id","fetched_at");--> statement-breakpoint
CREATE INDEX "post_analytics_project_idx" ON "post_analytics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "post_analytics_user_idx" ON "post_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "post_analytics_status_idx" ON "post_analytics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "post_analytics_next_fetch_idx" ON "post_analytics" USING btree ("next_fetch_at");