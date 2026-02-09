-- Добавление полей для настройки формата видео
-- video_dimension: размеры видео (width, height)
-- video_aspect_ratio: соотношение сторон ('16:9', '9:16', '1:1')

ALTER TABLE "scripts_media" 
ADD COLUMN IF NOT EXISTS "video_dimension" JSONB;

ALTER TABLE "scripts_media" 
ADD COLUMN IF NOT EXISTS "video_aspect_ratio" VARCHAR 
CHECK ("video_aspect_ratio" IN ('16:9', '9:16', '1:1'));

-- Комментарии для документации
COMMENT ON COLUMN "scripts_media"."video_dimension" IS 'Размеры видео в формате {"width": number, "height": number}';
COMMENT ON COLUMN "scripts_media"."video_aspect_ratio" IS 'Соотношение сторон видео: 16:9 (горизонтальное), 9:16 (вертикальное), 1:1 (квадратное)';
