/**
 * Manual migration: Create scripts_library table
 * Run: tsx server/db/add-scripts-library-table.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

async function addScriptsLibraryTable() {
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
    console.log('Creating scripts_library table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "scripts_library" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
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
        "project_id" varchar REFERENCES "projects"("id") ON DELETE SET NULL,
        "version" integer DEFAULT 1 NOT NULL,
        "parent_script_id" varchar REFERENCES "scripts_library"("id"),
        "created_at" timestamp DEFAULT NOW() NOT NULL,
        "updated_at" timestamp DEFAULT NOW() NOT NULL,
        "analyzed_at" timestamp,
        "tags" jsonb,
        "notes" text
      );
    `);
    
    console.log('Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "scripts_library_user_id_idx" ON "scripts_library"("user_id");
      CREATE INDEX IF NOT EXISTS "scripts_library_status_idx" ON "scripts_library"("status");
      CREATE INDEX IF NOT EXISTS "scripts_library_source_idx" ON "scripts_library"("source_type", "source_id");
      CREATE INDEX IF NOT EXISTS "scripts_library_project_idx" ON "scripts_library"("project_id");
    `);
    
    console.log('✅ scripts_library table created successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addScriptsLibraryTable();

