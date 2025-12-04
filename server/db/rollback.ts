/**
 * Database Rollback Script
 * Handles rolling back migrations when deployments fail
 *
 * Usage:
 *   npm run db:rollback -- --to=0000_empty_captain_flint
 *   DATABASE_URL=<url> npm run db:rollback -- --to=migration_name
 *
 * ⚠️ WARNING: This will DELETE data! Always backup before rollback.
 *
 * How it works:
 * 1. Drizzle doesn't generate automatic rollback migrations
 * 2. This script provides a framework for manual rollback SQL
 * 3. Each migration should have a corresponding rollback file (optional)
 * 4. Rollback SQL files: drizzle/migrations/rollback/XXXX_name.sql
 */

// CRITICAL: Load environment variables from .env file FIRST
import dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { logger } from '../lib/logger.js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const { Pool } = pg;

interface RollbackOptions {
  targetMigration?: string;
  steps?: number;
}

async function rollbackMigrations(options: RollbackOptions = {}) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  logger.warn('⚠️  ROLLBACK OPERATION STARTING', {
    timestamp: new Date().toISOString(),
    target: options.targetMigration || `last ${options.steps || 1} migration(s)`
  });

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    // Test database connection
    logger.info('Testing database connection...');
    await pool.query('SELECT 1');
    logger.info('✅ Database connection successful');

    // Get current migration history
    const historyResult = await pool.query(`
      SELECT id, hash, created_at
      FROM __drizzle_migrations
      ORDER BY created_at DESC
    `);

    if (historyResult.rows.length === 0) {
      logger.info('No migrations to rollback');
      process.exit(0);
    }

    logger.info('Current migration history:', {
      count: historyResult.rows.length,
      latest: historyResult.rows[0]
    });

    // Determine which migrations to rollback
    let migrationsToRollback: Array<{ id: number; hash: string; created_at: Date }> = [];

    if (options.targetMigration) {
      // Rollback to a specific migration
      const targetIndex = historyResult.rows.findIndex(
        (row: any) => row.hash.includes(options.targetMigration)
      );

      if (targetIndex === -1) {
        logger.error(`Migration "${options.targetMigration}" not found in history`);
        process.exit(1);
      }

      migrationsToRollback = historyResult.rows.slice(0, targetIndex);
    } else {
      // Rollback N steps
      const steps = options.steps || 1;
      migrationsToRollback = historyResult.rows.slice(0, steps);
    }

    if (migrationsToRollback.length === 0) {
      logger.info('No migrations to rollback');
      process.exit(0);
    }

    logger.warn(`⚠️  About to rollback ${migrationsToRollback.length} migration(s):`, {
      migrations: migrationsToRollback.map((m: any) => ({ id: m.id, hash: m.hash }))
    });

    // Check for rollback SQL files
    const rollbackDir = './drizzle/migrations/rollback';
    let rollbackFiles: string[] = [];

    try {
      rollbackFiles = await readdir(rollbackDir);
    } catch (error) {
      logger.warn('No rollback directory found at drizzle/migrations/rollback/');
      logger.warn('You will need to manually create rollback SQL');
    }

    // Execute rollbacks in reverse order (newest first)
    for (const migration of migrationsToRollback) {
      const migrationHash = migration.hash;
      logger.info(`Rolling back migration: ${migrationHash}`);

      // Look for corresponding rollback file
      const rollbackFile = rollbackFiles.find((f: string) =>
        f.includes(migrationHash.split('_')[0]) && f.endsWith('.sql')
      );

      if (rollbackFile) {
        const rollbackSqlPath = join(rollbackDir, rollbackFile);
        const rollbackSql = await readFile(rollbackSqlPath, 'utf-8');

        logger.info(`Executing rollback SQL from: ${rollbackFile}`);

        // Execute rollback SQL
        await pool.query(rollbackSql);
        logger.info(`✅ Rollback SQL executed for ${migrationHash}`);
      } else {
        logger.warn(`⚠️  No rollback SQL found for ${migrationHash}`);
        logger.warn('To create a rollback file:');
        logger.warn(`1. Create file: drizzle/migrations/rollback/${migrationHash}.sql`);
        logger.warn('2. Add SQL to undo the migration (DROP TABLE, etc.)');
        logger.warn('3. Re-run this script');

        logger.error('❌ Cannot proceed without rollback SQL');
        logger.error('Manual intervention required or restore from backup');
        process.exit(1);
      }

      // Remove from migration history
      await pool.query(
        'DELETE FROM __drizzle_migrations WHERE id = $1',
        [migration.id]
      );
      logger.info(`✅ Removed ${migrationHash} from migration history`);
    }

    logger.info('✅ Rollback completed successfully');
    logger.info('Current state:', {
      remainingMigrations: historyResult.rows.length - migrationsToRollback.length
    });

    // Show remaining migrations
    const remainingResult = await pool.query(`
      SELECT id, hash, created_at
      FROM __drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (remainingResult.rows.length > 0) {
      logger.info('Remaining migrations:', {
        migrations: remainingResult.rows
      });
    } else {
      logger.info('Database is now at initial state (no migrations applied)');
    }

    process.exit(0);

  } catch (error: any) {
    logger.error('❌ Rollback failed:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    logger.error('\\n❌ ROLLBACK FAILED');
    logger.error('Error:', error.message);

    if (error.code) {
      logger.error('Error code:', error.code);
    }

    logger.error('\\nRecovery options:');
    logger.error('1. Fix the rollback SQL and try again');
    logger.error('2. Restore database from backup');
    logger.error('3. Manually revert changes and update __drizzle_migrations table');
    logger.error('\\nFor backup restoration, see RUNBOOK.md');

    process.exit(1);

  } finally {
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: RollbackOptions = {};

for (const arg of args) {
  if (arg.startsWith('--to=')) {
    options.targetMigration = arg.split('=')[1];
  } else if (arg.startsWith('--steps=')) {
    options.steps = parseInt(arg.split('=')[1], 10);
  }
}

// Require confirmation in production
if (process.env.NODE_ENV === 'production') {
  const confirmArg = args.find(arg => arg === '--confirm');

  if (!confirmArg) {
    logger.error('❌ Production rollback requires --confirm flag');
    logger.error('Usage: NODE_ENV=production npm run db:rollback -- --confirm --steps=1');
    logger.error('⚠️  Always backup database before production rollback!');
    process.exit(1);
  }
}

// Run rollback
rollbackMigrations(options).catch((error) => {
  logger.error('Fatal error during rollback:', error);
  process.exit(1);
});
