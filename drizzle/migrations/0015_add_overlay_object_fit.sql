-- ============================================================================
-- МИГРАЦИЯ 0015: Добавление object_fit в scene_overlay_layers
-- ============================================================================
-- Сохраняет выбранный тип заполнения overlay-слоя (contain/cover/fill)
-- ============================================================================

ALTER TABLE "scene_overlay_layers"
ADD COLUMN IF NOT EXISTS "object_fit" varchar(20) NOT NULL DEFAULT 'contain';
--> statement-breakpoint

COMMENT ON COLUMN "scene_overlay_layers"."object_fit" IS 'Тип заполнения: contain, cover, fill';
