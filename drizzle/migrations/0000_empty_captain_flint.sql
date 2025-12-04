CREATE TABLE "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" varchar(50) NOT NULL,
	"encrypted_key" text NOT NULL,
	"last4" varchar(4),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" text,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "rss_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" varchar NOT NULL,
	"user_id" varchar,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"content" text,
	"full_content" text,
	"last_fetched_at" timestamp,
	"image_url" text,
	"ai_score" integer,
	"ai_comment" text,
	"user_action" varchar(20),
	"action_at" timestamp,
	"used_in_project" varchar,
	"freshness_score" integer,
	"virality_score" integer,
	"quality_score" integer,
	"published_at" timestamp,
	"parsed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rss_sources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"topic" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_parsed" timestamp,
	"parse_status" varchar(20) DEFAULT 'pending',
	"parse_error" text,
	"item_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instagram_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"short_code" varchar(255),
	"caption" text,
	"url" text NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"video_duration" integer,
	"local_video_path" text,
	"local_thumbnail_path" text,
	"download_status" varchar(20) DEFAULT 'pending',
	"download_error" text,
	"transcription_text" text,
	"transcription_status" varchar(20) DEFAULT 'pending',
	"transcription_error" text,
	"language" varchar(10),
	"likes_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"video_view_count" integer DEFAULT 0,
	"video_play_count" integer DEFAULT 0,
	"shares_count" integer DEFAULT 0,
	"hashtags" text[],
	"mentions" text[],
	"owner_username" varchar(255),
	"owner_full_name" varchar(255),
	"owner_id" varchar(255),
	"music_info" jsonb,
	"ai_score" integer,
	"ai_comment" text,
	"user_action" varchar(20),
	"action_at" timestamp,
	"used_in_project" varchar,
	"freshness_score" integer,
	"virality_score" integer,
	"quality_score" integer,
	"published_at" timestamp,
	"parsed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instagram_sources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"username" varchar(255) NOT NULL,
	"profile_url" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_parsed" timestamp,
	"parse_status" varchar(20) DEFAULT 'pending',
	"parse_error" text,
	"item_count" integer DEFAULT 0 NOT NULL,
	"last_scraped_date" timestamp,
	"last_scraped_reel_id" varchar(255),
	"auto_update_enabled" boolean DEFAULT true NOT NULL,
	"check_interval_hours" integer DEFAULT 6 NOT NULL,
	"last_checked_at" timestamp,
	"last_successful_parse_at" timestamp,
	"next_check_at" timestamp,
	"total_checks" integer DEFAULT 0 NOT NULL,
	"new_reels_found" integer DEFAULT 0 NOT NULL,
	"failed_checks" integer DEFAULT 0 NOT NULL,
	"notify_new_reels" boolean DEFAULT true NOT NULL,
	"notify_viral_only" boolean DEFAULT false NOT NULL,
	"viral_threshold" integer DEFAULT 100000 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"step_number" integer NOT NULL,
	"data" jsonb,
	"completed_at" timestamp,
	"skip_reason" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar(255),
	"source_type" varchar(20) NOT NULL,
	"source_data" jsonb,
	"current_stage" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_recommendations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"script_version_id" varchar NOT NULL,
	"scene_id" integer NOT NULL,
	"priority" varchar(10) NOT NULL,
	"area" varchar(50) NOT NULL,
	"current_text" text NOT NULL,
	"suggested_text" text NOT NULL,
	"reasoning" text NOT NULL,
	"expected_impact" varchar(100) NOT NULL,
	"source_agent" varchar(20),
	"score_delta" integer,
	"confidence" real,
	"applied" boolean DEFAULT false NOT NULL,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_versions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"version_number" integer NOT NULL,
	"created_by" varchar(20) NOT NULL,
	"full_script" text NOT NULL,
	"scenes" jsonb NOT NULL,
	"changes" jsonb,
	"provenance" jsonb,
	"diff" jsonb,
	"analysis_result" jsonb,
	"analysis_score" integer,
	"is_current" boolean DEFAULT false NOT NULL,
	"parent_version_id" varchar,
	"is_candidate" boolean DEFAULT false NOT NULL,
	"is_rejected" boolean DEFAULT false NOT NULL,
	"base_version_id" varchar,
	"metrics" jsonb,
	"review" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ig_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"fb_user_id" varchar NOT NULL,
	"fb_page_id" varchar NOT NULL,
	"ig_user_id" varchar NOT NULL,
	"ig_username" varchar(255),
	"access_token_encrypted" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"account_status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ig_media" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ig_account_id" varchar NOT NULL,
	"ig_media_id" varchar NOT NULL,
	"permalink" text NOT NULL,
	"media_type" varchar(20) DEFAULT 'REEL' NOT NULL,
	"caption" text,
	"thumbnail_url" text,
	"published_at" timestamp NOT NULL,
	"last_synced_at" timestamp,
	"next_sync_at" timestamp,
	"sync_status" varchar(20) DEFAULT 'idle' NOT NULL,
	"sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ig_media_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ig_media_id" varchar NOT NULL,
	"collected_at" timestamp DEFAULT now() NOT NULL,
	"metrics" jsonb NOT NULL,
	"raw" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_version_bindings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"version_id" varchar NOT NULL,
	"ig_media_id" varchar NOT NULL,
	"bind_type" varchar(20) DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rss_items" ADD CONSTRAINT "rss_items_source_id_rss_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."rss_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rss_items" ADD CONSTRAINT "rss_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rss_sources" ADD CONSTRAINT "rss_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_items" ADD CONSTRAINT "instagram_items_source_id_instagram_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."instagram_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_items" ADD CONSTRAINT "instagram_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_sources" ADD CONSTRAINT "instagram_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_steps" ADD CONSTRAINT "project_steps_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_recommendations" ADD CONSTRAINT "scene_recommendations_script_version_id_script_versions_id_fk" FOREIGN KEY ("script_version_id") REFERENCES "public"."script_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_versions" ADD CONSTRAINT "script_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_versions" ADD CONSTRAINT "script_versions_parent_version_id_script_versions_id_fk" FOREIGN KEY ("parent_version_id") REFERENCES "public"."script_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_versions" ADD CONSTRAINT "script_versions_base_version_id_script_versions_id_fk" FOREIGN KEY ("base_version_id") REFERENCES "public"."script_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ig_accounts" ADD CONSTRAINT "ig_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ig_media" ADD CONSTRAINT "ig_media_ig_account_id_ig_accounts_id_fk" FOREIGN KEY ("ig_account_id") REFERENCES "public"."ig_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ig_media_insights" ADD CONSTRAINT "ig_media_insights_ig_media_id_ig_media_id_fk" FOREIGN KEY ("ig_media_id") REFERENCES "public"."ig_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_version_bindings" ADD CONSTRAINT "project_version_bindings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_version_bindings" ADD CONSTRAINT "project_version_bindings_version_id_script_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."script_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_version_bindings" ADD CONSTRAINT "project_version_bindings_ig_media_id_ig_media_id_fk" FOREIGN KEY ("ig_media_id") REFERENCES "public"."ig_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "rss_items_source_id_idx" ON "rss_items" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "rss_items_user_id_idx" ON "rss_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rss_items_ai_score_idx" ON "rss_items" USING btree ("ai_score");--> statement-breakpoint
CREATE INDEX "rss_items_user_action_idx" ON "rss_items" USING btree ("user_action");--> statement-breakpoint
CREATE INDEX "rss_items_published_at_idx" ON "rss_items" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "rss_sources_user_id_idx" ON "rss_sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "instagram_items_source_id_idx" ON "instagram_items" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "instagram_items_user_id_idx" ON "instagram_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "instagram_items_external_id_idx" ON "instagram_items" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "instagram_items_ai_score_idx" ON "instagram_items" USING btree ("ai_score");--> statement-breakpoint
CREATE INDEX "instagram_items_user_action_idx" ON "instagram_items" USING btree ("user_action");--> statement-breakpoint
CREATE INDEX "instagram_items_published_at_idx" ON "instagram_items" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "instagram_items_user_external_id_unique" ON "instagram_items" USING btree ("user_id","external_id");--> statement-breakpoint
CREATE INDEX "instagram_sources_user_id_idx" ON "instagram_sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "instagram_sources_next_check_idx" ON "instagram_sources" USING btree ("next_check_at");--> statement-breakpoint
CREATE INDEX "project_steps_project_id_idx" ON "project_steps" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_steps_project_step_unique" ON "project_steps" USING btree ("project_id","step_number");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scene_recommendations_version_idx" ON "scene_recommendations" USING btree ("script_version_id");--> statement-breakpoint
CREATE INDEX "scene_recommendations_scene_idx" ON "scene_recommendations" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scene_recommendations_version_applied_idx" ON "scene_recommendations" USING btree ("script_version_id","applied");--> statement-breakpoint
CREATE INDEX "script_versions_project_idx" ON "script_versions" USING btree ("project_id","version_number");--> statement-breakpoint
CREATE INDEX "script_versions_current_idx" ON "script_versions" USING btree ("project_id","is_current");--> statement-breakpoint
CREATE INDEX "script_versions_proj_desc_idx" ON "script_versions" USING btree ("project_id","version_number" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_script_current" ON "script_versions" USING btree ("project_id") WHERE "script_versions"."is_current" = true;--> statement-breakpoint
CREATE INDEX "ig_accounts_user_id_idx" ON "ig_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ig_accounts_ig_user_id_idx" ON "ig_accounts" USING btree ("ig_user_id");--> statement-breakpoint
CREATE INDEX "ig_media_account_id_idx" ON "ig_media" USING btree ("ig_account_id");--> statement-breakpoint
CREATE INDEX "ig_media_published_at_idx" ON "ig_media" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "ig_media_next_sync_idx" ON "ig_media" USING btree ("next_sync_at");--> statement-breakpoint
CREATE INDEX "ig_media_sync_status_idx" ON "ig_media" USING btree ("sync_status");--> statement-breakpoint
CREATE UNIQUE INDEX "ig_media_account_media_unique" ON "ig_media" USING btree ("ig_account_id","ig_media_id");--> statement-breakpoint
CREATE INDEX "ig_media_insights_media_id_idx" ON "ig_media_insights" USING btree ("ig_media_id");--> statement-breakpoint
CREATE INDEX "ig_media_insights_collected_at_idx" ON "ig_media_insights" USING btree ("collected_at");--> statement-breakpoint
CREATE INDEX "project_version_bindings_project_idx" ON "project_version_bindings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_version_bindings_version_idx" ON "project_version_bindings" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "project_version_bindings_media_idx" ON "project_version_bindings" USING btree ("ig_media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_version_binding" ON "project_version_bindings" USING btree ("version_id");