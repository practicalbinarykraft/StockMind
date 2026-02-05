CREATE TABLE "scene_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"script_id" varchar NOT NULL,
	"script_type" varchar(20) NOT NULL,
	"scene_id" varchar NOT NULL,
	"scene_index" integer NOT NULL,
	"comment_text" text NOT NULL,
	"comment_type" varchar(20) DEFAULT 'prompt' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scene_comments" ADD CONSTRAINT "scene_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scene_comments_script_idx" ON "scene_comments" USING btree ("script_id");--> statement-breakpoint
CREATE INDEX "scene_comments_user_idx" ON "scene_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scene_comments_created_at_idx" ON "scene_comments" USING btree ("created_at");
