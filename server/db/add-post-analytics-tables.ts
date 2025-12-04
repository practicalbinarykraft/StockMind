/**
 * Manual migration: Create post analytics tables
 * Run: tsx server/db/add-post-analytics-tables.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

async function addPostAnalyticsTables() {
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
    console.log('Creating post_analytics table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "post_analytics" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" varchar NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "platform" varchar(50) NOT NULL,
        "post_url" text NOT NULL,
        "post_id" varchar(255),
        "update_interval_hours" integer DEFAULT 6 NOT NULL,
        "tracking_days" integer DEFAULT 30 NOT NULL,
        "is_active" boolean DEFAULT TRUE NOT NULL,
        "created_at" timestamp DEFAULT NOW() NOT NULL,
        "last_fetched_at" timestamp,
        "next_fetch_at" timestamp,
        "tracking_ends_at" timestamp,
        "status" varchar(50) DEFAULT 'pending' NOT NULL,
        "last_error" text,
        UNIQUE("project_id")
      );
    `);
    
    console.log('Creating analytics_snapshots table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "analytics_snapshots" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "analytics_id" varchar NOT NULL REFERENCES "post_analytics"("id") ON DELETE CASCADE,
        "views" integer,
        "likes" integer,
        "comments" integer,
        "shares" integer,
        "saves" integer,
        "reach" integer,
        "impressions" integer,
        "plays" integer,
        "watch_time_seconds" integer,
        "engagement_rate" decimal(5,2),
        "fetched_at" timestamp DEFAULT NOW() NOT NULL
      );
    `);
    
    console.log('Creating analytics_fetch_queue table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "analytics_fetch_queue" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "analytics_id" varchar NOT NULL REFERENCES "post_analytics"("id") ON DELETE CASCADE,
        "status" varchar(50) DEFAULT 'pending' NOT NULL,
        "scheduled_at" timestamp NOT NULL,
        "started_at" timestamp,
        "completed_at" timestamp,
        "apify_run_id" varchar(255),
        "error_message" text,
        "retry_count" integer DEFAULT 0 NOT NULL
      );
    `);
    
    console.log('Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "post_analytics_project_idx" ON "post_analytics"("project_id");
      CREATE INDEX IF NOT EXISTS "post_analytics_user_idx" ON "post_analytics"("user_id");
      CREATE INDEX IF NOT EXISTS "post_analytics_status_idx" ON "post_analytics"("status");
      CREATE INDEX IF NOT EXISTS "post_analytics_next_fetch_idx" ON "post_analytics"("next_fetch_at");
      CREATE INDEX IF NOT EXISTS "analytics_snapshots_analytics_idx" ON "analytics_snapshots"("analytics_id");
      CREATE INDEX IF NOT EXISTS "analytics_snapshots_time_idx" ON "analytics_snapshots"("analytics_id", "fetched_at" DESC);
      CREATE INDEX IF NOT EXISTS "analytics_queue_status_idx" ON "analytics_fetch_queue"("status", "scheduled_at");
      CREATE INDEX IF NOT EXISTS "analytics_queue_analytics_idx" ON "analytics_fetch_queue"("analytics_id");
    `);
    
    console.log('✅ Post analytics tables created successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addPostAnalyticsTables();

