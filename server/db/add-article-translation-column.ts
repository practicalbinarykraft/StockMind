import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

async function addArticleTranslationColumn() {
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
    console.log('Adding article_translation column to rss_items...');
    
    await pool.query(`
      ALTER TABLE "rss_items" 
      ADD COLUMN IF NOT EXISTS "article_translation" jsonb;
    `);
    
    console.log('✅ article_translation column added successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addArticleTranslationColumn();

