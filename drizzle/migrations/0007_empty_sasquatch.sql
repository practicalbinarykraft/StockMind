CREATE TABLE "auto_script_versions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auto_script_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"scenes" jsonb NOT NULL,
	"full_script" text NOT NULL,
	"final_score" integer,
	"hook_score" integer,
	"structure_score" integer,
	"emotional_score" integer,
	"cta_score" integer,
	"feedback_text" text,
	"feedback_scene_ids" jsonb,
	"diff" jsonb,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_feedback_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"auto_script_id" varchar,
	"auto_script_version_id" varchar,
	"feedback_type" varchar(20) NOT NULL,
	"feedback_text" text NOT NULL,
	"target_scene_ids" jsonb,
	"original_script" text,
	"original_scenes" jsonb,
	"extracted_patterns" jsonb,
	"extracted_sentiment" varchar(20),
	"processed_at" timestamp,
	"applied_to_profile" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_writing_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"avoid_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prefer_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tone_preference" varchar(50),
	"style_notes" text,
	"writing_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_summary" text,
	"total_feedback_count" integer DEFAULT 0 NOT NULL,
	"last_feedback_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_writing_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "conveyor_settings" ADD COLUMN "style_preferences" jsonb DEFAULT '{"formality":"conversational","tone":"engaging","language":"ru"}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "conveyor_settings" ADD COLUMN "custom_guidelines" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "conveyor_settings" ADD COLUMN "duration_range" jsonb DEFAULT '{"min":30,"max":90}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "conveyor_settings" ADD COLUMN "custom_prompts" jsonb;--> statement-breakpoint
ALTER TABLE "conveyor_settings" ADD COLUMN "script_examples" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "auto_script_versions" ADD CONSTRAINT "auto_script_versions_auto_script_id_auto_scripts_id_fk" FOREIGN KEY ("auto_script_id") REFERENCES "public"."auto_scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_script_versions" ADD CONSTRAINT "auto_script_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback_entries" ADD CONSTRAINT "user_feedback_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback_entries" ADD CONSTRAINT "user_feedback_entries_auto_script_id_auto_scripts_id_fk" FOREIGN KEY ("auto_script_id") REFERENCES "public"."auto_scripts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback_entries" ADD CONSTRAINT "user_feedback_entries_auto_script_version_id_auto_script_versions_id_fk" FOREIGN KEY ("auto_script_version_id") REFERENCES "public"."auto_script_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_writing_profiles" ADD CONSTRAINT "user_writing_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auto_script_versions_script_idx" ON "auto_script_versions" USING btree ("auto_script_id");--> statement-breakpoint
CREATE INDEX "auto_script_versions_user_idx" ON "auto_script_versions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auto_script_versions_current_idx" ON "auto_script_versions" USING btree ("auto_script_id","is_current");--> statement-breakpoint
CREATE INDEX "user_feedback_entries_user_idx" ON "user_feedback_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_feedback_entries_script_idx" ON "user_feedback_entries" USING btree ("auto_script_id");--> statement-breakpoint
CREATE INDEX "user_feedback_entries_processed_idx" ON "user_feedback_entries" USING btree ("user_id","applied_to_profile");--> statement-breakpoint
CREATE INDEX "user_writing_profiles_user_idx" ON "user_writing_profiles" USING btree ("user_id");