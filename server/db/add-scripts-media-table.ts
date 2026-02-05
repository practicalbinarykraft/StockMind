/**
 * Manual migration: Create scripts_media table
 * Run: tsx server/db/add-scripts-media-table.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

async function addScriptsMediaTable() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('Creating scripts_media table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "scripts_media" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "script_id" varchar UNIQUE NOT NULL REFERENCES "scripts_library"("id") ON DELETE CASCADE,
        
        -- Аудио
        "audio_url" varchar,
        "audio_mode" varchar CHECK ("audio_mode" IN ('generate', 'upload', 'record')),
        "selected_voice" varchar,
        "audio_filename" varchar,
        "audio_filesize" integer,
        "audio_generated_at" timestamp,
        
        -- Видео
        "video_url" varchar,
        "video_id" varchar,
        "selected_avatar" varchar,
        "video_duration" real,
        "video_status" varchar CHECK ("video_status" IN ('generating', 'completed', 'failed')),
        "video_thumbnail_url" varchar,
        "video_generated_at" timestamp,
        "video_error_message" text,
        
        "created_at" timestamp DEFAULT NOW() NOT NULL,
        "updated_at" timestamp DEFAULT NOW() NOT NULL
      );
    `);
    
    console.log('Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "idx_scripts_media_script_id" ON "scripts_media"("script_id");
    `);
    
    console.log('✅ scripts_media table created successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addScriptsMediaTable();
