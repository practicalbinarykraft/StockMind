-- ============================================================================
-- ДОБАВЛЕНИЕ ПОЛЕЙ В scripts_library ДЛЯ РЕДАКТОРА
-- ============================================================================

ALTER TABLE "scripts_library" ADD COLUMN "editor_state" jsonb;
--> statement-breakpoint
ALTER TABLE "scripts_library" ADD COLUMN "last_checkpoint_at" timestamp;
--> statement-breakpoint

-- ============================================================================
-- ТАБЛИЦА script_checkpoints
-- Технические снапшоты для восстановления и защиты от потери данных
-- ============================================================================

CREATE TABLE "script_checkpoints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"script_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"kind" varchar(20) DEFAULT 'checkpoint' NOT NULL,
	"reason" varchar(50) NOT NULL,
	"scenes" jsonb NOT NULL,
	"full_text" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint

ALTER TABLE "script_checkpoints" ADD CONSTRAINT "script_checkpoints_script_id_scripts_library_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts_library"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "script_checkpoints" ADD CONSTRAINT "script_checkpoints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "script_checkpoints_script_id_idx" ON "script_checkpoints" USING btree ("script_id");
--> statement-breakpoint
CREATE INDEX "script_checkpoints_user_id_idx" ON "script_checkpoints" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "script_checkpoints_expires_at_idx" ON "script_checkpoints" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "script_checkpoints_reason_idx" ON "script_checkpoints" USING btree ("reason");
--> statement-breakpoint
CREATE INDEX "script_checkpoints_created_at_idx" ON "script_checkpoints" USING btree ("created_at");
--> statement-breakpoint

-- ============================================================================
-- ТАБЛИЦА editor_operation_log
-- Аудит всех операций в редакторе для отладки и понимания поведения пользователя
-- ============================================================================

CREATE TABLE "editor_operation_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"script_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"operation_type" varchar(50) NOT NULL,
	"scene_id" varchar,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "editor_operation_log" ADD CONSTRAINT "editor_operation_log_script_id_scripts_library_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts_library"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "editor_operation_log" ADD CONSTRAINT "editor_operation_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "editor_operation_log_script_id_idx" ON "editor_operation_log" USING btree ("script_id");
--> statement-breakpoint
CREATE INDEX "editor_operation_log_user_id_idx" ON "editor_operation_log" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "editor_operation_log_operation_type_idx" ON "editor_operation_log" USING btree ("operation_type");
--> statement-breakpoint
CREATE INDEX "editor_operation_log_created_at_idx" ON "editor_operation_log" USING btree ("created_at");
--> statement-breakpoint

-- ============================================================================
-- КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================================================

COMMENT ON TABLE "script_checkpoints" IS 'Технические снапшоты для автосохранения и восстановления. TTL=7 дней';
COMMENT ON TABLE "editor_operation_log" IS 'Лог операций редактора для аудита и отладки';
COMMENT ON COLUMN "scripts_library"."editor_state" IS 'Состояние редактора: {lastEditedAt, lastEditedSceneId}';
COMMENT ON COLUMN "scripts_library"."last_checkpoint_at" IS 'Время последнего checkpoint для оптимизации';
COMMENT ON COLUMN "script_checkpoints"."reason" IS 'exit|ttl|recovery|pre_ai|auto - причина создания checkpoint';
COMMENT ON COLUMN "script_checkpoints"."expires_at" IS 'Дата истечения (created_at + 7 дней)';
COMMENT ON COLUMN "editor_operation_log"."operation_type" IS 'scene_edit|save|auto_save|checkpoint|ai_regenerate|cancel|create_version';
