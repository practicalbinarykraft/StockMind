import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

async function cleanupOrphanedUsedInProject() {
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
    console.log('Cleaning up orphaned usedInProject references...');
    
    // Find RSS items with usedInProject pointing to non-existent or deleted projects
    const rssResult = await pool.query(`
      UPDATE rss_items 
      SET used_in_project = NULL, user_action = NULL
      WHERE used_in_project IS NOT NULL 
        AND used_in_project NOT IN (
          SELECT id FROM projects WHERE status != 'deleted'
        )
    `);
    
    console.log(`✅ Cleared ${rssResult.rowCount} orphaned RSS item references`);
    
    // Find Instagram items with usedInProject pointing to non-existent or deleted projects
    try {
      const instagramResult = await pool.query(`
        UPDATE instagram_items 
        SET used_in_project = NULL, user_action = NULL
        WHERE used_in_project IS NOT NULL 
          AND used_in_project NOT IN (
            SELECT id FROM projects WHERE status != 'deleted'
          )
      `);
      console.log(`✅ Cleared ${instagramResult.rowCount} orphaned Instagram item references`);
    } catch (error: any) {
      // Instagram items table might not exist, skip it
      if (error.message.includes('does not exist')) {
        console.log('ℹ️  Instagram items table does not exist, skipping...');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Cleanup completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanupOrphanedUsedInProject();
