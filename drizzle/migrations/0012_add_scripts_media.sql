-- Создание таблицы scripts_media для хранения медиа-данных сценариев
CREATE TABLE IF NOT EXISTS "scripts_media" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "script_id" VARCHAR UNIQUE NOT NULL,
  
  -- Аудио
  "audio_url" VARCHAR,
  "audio_mode" VARCHAR CHECK ("audio_mode" IN ('generate', 'upload', 'record')),
  "selected_voice" VARCHAR,
  "audio_filename" VARCHAR,
  "audio_filesize" INTEGER,
  "audio_generated_at" TIMESTAMP,
  
  -- Видео
  "video_url" VARCHAR,
  "video_id" VARCHAR,
  "selected_avatar" VARCHAR,
  "video_duration" REAL,
  "video_status" VARCHAR CHECK ("video_status" IN ('generating', 'completed', 'failed')),
  "video_thumbnail_url" VARCHAR,
  "video_generated_at" TIMESTAMP,
  "video_error_message" TEXT,
  
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  
  CONSTRAINT "scripts_media_script_id_fkey" 
    FOREIGN KEY ("script_id") 
    REFERENCES "scripts_library"("id") 
    ON DELETE CASCADE
);

-- Создание индекса для быстрого поиска по script_id
CREATE INDEX IF NOT EXISTS "idx_scripts_media_script_id" 
ON "scripts_media"("script_id");
