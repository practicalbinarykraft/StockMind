-- ============================================================================
-- МИГРАЦИЯ 0014: Система многослойной композиции для видеоредактора
-- ============================================================================
-- Добавляет поддержку слоёв (background, overlay, text) для каждой сцены
-- с поддержкой генерации контента через Kie.ai и настройки композиции
-- ============================================================================

-- ============================================================================
-- 1. ТАБЛИЦА scene_layers (базовая таблица слоёв)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "scene_layers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" varchar NOT NULL,
	"script_id" varchar NOT NULL,
	"layer_type" varchar(20) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================================================
-- 2. ТАБЛИЦА scene_background_layers (фоновые слои)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "scene_background_layers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"layer_id" varchar NOT NULL,
	"content_type" varchar(20) NOT NULL,
	"source_url" varchar,
	"generation_prompt" text,
	"generation_model" varchar,
	"generation_status" varchar(20),
	"generation_job_id" varchar,
	"dimensions" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scene_background_layers_layer_id_unique" UNIQUE("layer_id")
);
--> statement-breakpoint

-- ============================================================================
-- 3. ТАБЛИЦА scene_overlay_layers (overlay слои)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "scene_overlay_layers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"layer_id" varchar NOT NULL,
	"content_type" varchar(20) NOT NULL,
	"source_url" varchar,
	"position" jsonb NOT NULL,
	"aspect_lock" boolean DEFAULT true NOT NULL,
	"min_size" jsonb,
	"max_size" jsonb,
	"rotation" real DEFAULT 0,
	"generation_prompt" text,
	"generation_model" varchar,
	"generation_status" varchar(20),
	"generation_job_id" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scene_overlay_layers_layer_id_unique" UNIQUE("layer_id")
);
--> statement-breakpoint

-- ============================================================================
-- 4. ТАБЛИЦА scene_text_layers (текстовые слои)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "scene_text_layers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"layer_id" varchar NOT NULL,
	"text" text NOT NULL,
	"mode" varchar(20) DEFAULT 'static' NOT NULL,
	"position" jsonb NOT NULL,
	"font_size" integer DEFAULT 32 NOT NULL,
	"font_family" varchar DEFAULT 'Inter' NOT NULL,
	"text_color" varchar(9) DEFAULT '#FFFFFF' NOT NULL,
	"text_align" varchar(10) DEFAULT 'center' NOT NULL,
	"background_color" varchar(9),
	"background_opacity" real DEFAULT 0.8 NOT NULL,
	"marquee_speed" real DEFAULT 100,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scene_text_layers_layer_id_unique" UNIQUE("layer_id")
);
--> statement-breakpoint

-- ============================================================================
-- 5. ТАБЛИЦА scene_compositions (настройки композиции сцены)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "scene_compositions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" varchar NOT NULL,
	"script_id" varchar NOT NULL,
	"mode" varchar(20) DEFAULT 'overlay' NOT NULL,
	"split_ratio" real DEFAULT 0.5,
	"split_direction" varchar(20) DEFAULT 'horizontal',
	"split_order" varchar(30) DEFAULT 'background-first',
	"grid_snapping" boolean DEFAULT true NOT NULL,
	"grid_size" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scene_compositions_scene_id_unique" UNIQUE("scene_id")
);
--> statement-breakpoint

-- ============================================================================
-- 6. ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ТАБЛИЦ
-- ============================================================================

-- Добавление поля editor_version в scripts_library
ALTER TABLE "scripts_library" 
ADD COLUMN IF NOT EXISTS "editor_version" varchar(20) DEFAULT 'v1';
--> statement-breakpoint

-- Добавление полей композиции и фоновой музыки в scripts_media
ALTER TABLE "scripts_media" 
ADD COLUMN IF NOT EXISTS "composition_settings" jsonb;
--> statement-breakpoint

ALTER TABLE "scripts_media" 
ADD COLUMN IF NOT EXISTS "background_music_url" varchar;
--> statement-breakpoint

ALTER TABLE "scripts_media" 
ADD COLUMN IF NOT EXISTS "background_music_volume" real DEFAULT 0.3;
--> statement-breakpoint

-- ============================================================================
-- 7. FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE "scene_layers" 
ADD CONSTRAINT "scene_layers_script_id_scripts_library_id_fk" 
FOREIGN KEY ("script_id") REFERENCES "public"."scripts_library"("id") 
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "scene_background_layers" 
ADD CONSTRAINT "scene_background_layers_layer_id_scene_layers_id_fk" 
FOREIGN KEY ("layer_id") REFERENCES "public"."scene_layers"("id") 
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "scene_overlay_layers" 
ADD CONSTRAINT "scene_overlay_layers_layer_id_scene_layers_id_fk" 
FOREIGN KEY ("layer_id") REFERENCES "public"."scene_layers"("id") 
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "scene_text_layers" 
ADD CONSTRAINT "scene_text_layers_layer_id_scene_layers_id_fk" 
FOREIGN KEY ("layer_id") REFERENCES "public"."scene_layers"("id") 
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "scene_compositions" 
ADD CONSTRAINT "scene_compositions_script_id_scripts_library_id_fk" 
FOREIGN KEY ("script_id") REFERENCES "public"."scripts_library"("id") 
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- ============================================================================
-- 8. ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ЗАПРОСОВ
-- ============================================================================

-- Индексы для scene_layers
CREATE INDEX IF NOT EXISTS "scene_layers_script_id_idx" 
ON "scene_layers" USING btree ("script_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "scene_layers_scene_id_idx" 
ON "scene_layers" USING btree ("scene_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "scene_layers_script_scene_idx" 
ON "scene_layers" USING btree ("script_id","scene_id");
--> statement-breakpoint

-- Индексы для scene_background_layers
CREATE INDEX IF NOT EXISTS "scene_background_layers_layer_id_idx" 
ON "scene_background_layers" USING btree ("layer_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "scene_background_layers_generation_status_idx" 
ON "scene_background_layers" USING btree ("generation_status");
--> statement-breakpoint

-- Индексы для scene_overlay_layers
CREATE INDEX IF NOT EXISTS "scene_overlay_layers_layer_id_idx" 
ON "scene_overlay_layers" USING btree ("layer_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "scene_overlay_layers_generation_status_idx" 
ON "scene_overlay_layers" USING btree ("generation_status");
--> statement-breakpoint

-- Индексы для scene_text_layers
CREATE INDEX IF NOT EXISTS "scene_text_layers_layer_id_idx" 
ON "scene_text_layers" USING btree ("layer_id");
--> statement-breakpoint

-- Индексы для scene_compositions
CREATE INDEX IF NOT EXISTS "scene_compositions_script_id_idx" 
ON "scene_compositions" USING btree ("script_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "scene_compositions_scene_id_idx" 
ON "scene_compositions" USING btree ("scene_id");
--> statement-breakpoint

-- ============================================================================
-- КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================================================

COMMENT ON TABLE "scene_layers" IS 'Базовая таблица слоёв для многослойной композиции сцен';
COMMENT ON TABLE "scene_background_layers" IS 'Фоновые слои с поддержкой генерации через Kie.ai/HeyGen';
COMMENT ON TABLE "scene_overlay_layers" IS 'Overlay слои с позиционированием и трансформацией';
COMMENT ON TABLE "scene_text_layers" IS 'Текстовые слои с настройками стиля и бегущей строки';
COMMENT ON TABLE "scene_compositions" IS 'Настройки композиции сцены (overlay/split режимы)';

COMMENT ON COLUMN "scripts_library"."editor_version" IS 'Версия редактора для миграций (v1, v2, etc.)';
COMMENT ON COLUMN "scripts_media"."composition_settings" IS 'Глобальные настройки композиции проекта';
COMMENT ON COLUMN "scripts_media"."background_music_url" IS 'URL фоновой музыки для всего проекта';
COMMENT ON COLUMN "scripts_media"."background_music_volume" IS 'Громкость фоновой музыки (0-1)';

COMMENT ON COLUMN "scene_layers"."layer_type" IS 'Тип слоя: background, overlay, textLayer';
COMMENT ON COLUMN "scene_layers"."order" IS 'Z-index порядок слоя';

COMMENT ON COLUMN "scene_background_layers"."content_type" IS 'Тип контента: avatar, image, video';
COMMENT ON COLUMN "scene_background_layers"."generation_status" IS 'Статус генерации: pending, processing, ready, failed';

COMMENT ON COLUMN "scene_overlay_layers"."position" IS 'Позиция в процентах: {x, y, width, height} (0-100%)';
COMMENT ON COLUMN "scene_overlay_layers"."aspect_lock" IS 'Фиксация пропорций при изменении размера';

COMMENT ON COLUMN "scene_text_layers"."mode" IS 'Режим текста: static или marquee (бегущая строка)';
COMMENT ON COLUMN "scene_text_layers"."position" IS 'Позиция: {type: top|center|bottom|custom, x?, y?}';

COMMENT ON COLUMN "scene_compositions"."mode" IS 'Режим композиции: overlay или split';
COMMENT ON COLUMN "scene_compositions"."split_ratio" IS 'Пропорция разделения для split-режима (0-1)';
