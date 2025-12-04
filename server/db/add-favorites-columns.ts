/**
 * Manual migration: Add favorites columns to rss_items
 * Run: tsx server/db/add-favorites-columns.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

async function addFavoritesColumns() {
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
    console.log('Adding favorites columns to rss_items...');
    
    await pool.query(`
      ALTER TABLE "rss_items" 
      ADD COLUMN IF NOT EXISTS "is_favorite" boolean DEFAULT false NOT NULL;
    `);
    
    await pool.query(`
      ALTER TABLE "rss_items" 
      ADD COLUMN IF NOT EXISTS "favorited_at" timestamp;
    `);
    
    await pool.query(`
      ALTER TABLE "rss_items" 
      ADD COLUMN IF NOT EXISTS "user_notes" text;
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "rss_items_is_favorite_idx" 
      ON "rss_items" USING btree ("is_favorite");
    `);

    console.log('✅ Favorites columns added successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addFavoritesColumns();
