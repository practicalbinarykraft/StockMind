/**
 * Database Migration Runner
 * Applies pending migrations to the database
 *
 * Usage:
 *   npm run db:migrate
 *   node server/db/migrate.js
 *   DATABASE_URL=<url> node server/db/migrate.js
 */

// CRITICAL: Load environment variables from .env file FIRST
import dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { logger } from '../lib/logger.js';

const { Pool } = pg;

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable is required');
    console.error('Set it in .env file or pass as environment variable');
    process.exit(1);
  }

  logger.info('Starting database migrations...', {
    timestamp: new Date().toISOString()
  });

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  let db;

  try {
    // Test database connection
    logger.info('Testing database connection...');
    await pool.query('SELECT 1');
    logger.info('✅ Database connection successful');

    // Create drizzle instance
    db = drizzle(pool);

    // Run migrations
    logger.info('Applying migrations from: ./drizzle/migrations');

    await migrate(db, {
      migrationsFolder: './drizzle/migrations',
      migrationsTable: '__drizzle_migrations'
    });

    logger.info('✅ Migrations completed successfully');

    // Show applied migrations
    const result = await pool.query(
      'SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5'
    );

    if (result.rows.length > 0) {
      logger.info('Recently applied migrations:', {
        count: result.rows.length,
        migrations: result.rows
      });
    }

    process.exit(0);

  } catch (error: any) {
    logger.error('❌ Migration failed:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    console.error('\n❌ MIGRATION FAILED');
    console.error('Error:', error.message);

    if (error.code) {
      console.error('Error code:', error.code);
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    console.error('\nTroubleshooting:');
    console.error('1. Check that DATABASE_URL is correct');
    console.error('2. Ensure database is running and accessible');
    console.error('3. Verify database user has CREATE TABLE permissions');
    console.error('4. Check migration files in drizzle/migrations/');

    process.exit(1);

  } finally {
    // Clean up
    await pool.end();
  }
}

// Run migrations
runMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
