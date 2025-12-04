import cron from 'node-cron';
import { parseRssSource } from '../lib/rss-background-tasks';
import { logCronJob } from '../lib/logger-helpers';
import { logger } from '../lib/logger';
import type { IStorage } from '../storage';

let storageInstance: IStorage;
let isRunning = false;

/**
 * Initialize RSS monitoring cron job
 * Parses all active RSS sources periodically
 */
export function initRssMonitor(storage: IStorage) {
  storageInstance = storage;

  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logCronJob('rssMonitor', 'started', { scheduledTime: new Date() });
    await checkAllSources();
  }, {
    timezone: process.env.CRON_TZ || 'UTC'
  });

  logger.info('RSS Monitor cron job initialized', { schedule: 'every 15 minutes' });

  // Run immediately on startup (non-blocking)
  checkAllSources().catch((error) => {
    logger.error('RSS Monitor startup check failed', {
      error: error.message,
      stack: error.stack
    });
  });
}

/**
 * Check all active RSS sources and parse them
 */
async function checkAllSources() {
  if (isRunning) {
    logger.warn('[RSS Monitor] Skipped: previous run still active');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    logger.info('[RSS Monitor] Starting RSS sources check...');

    // Get all active RSS sources across all users
    const activeSources = await storageInstance.getAllActiveRssSources();
    
    if (activeSources.length === 0) {
      logger.info('[RSS Monitor] No active RSS sources found');
      return;
    }

    logger.info(`[RSS Monitor] Found ${activeSources.length} active RSS sources to check`);

    // Parse each active source
    // Check if source needs parsing (not parsed in last 10 minutes to avoid spam)
    const now = Date.now();
    const minIntervalMs = 10 * 60 * 1000; // 10 minutes minimum interval

    let parsedCount = 0;
    let skippedCount = 0;

    for (const source of activeSources) {
      try {
        // Check if source was recently parsed
        const lastParsed = source.lastParsed ? new Date(source.lastParsed).getTime() : 0;
        const timeSinceLastParse = now - lastParsed;

        if (timeSinceLastParse < minIntervalMs) {
          skippedCount++;
          logger.debug(`[RSS Monitor] Skipping ${source.name} (parsed ${Math.round(timeSinceLastParse / 1000 / 60)} minutes ago)`);
          continue;
        }

        logger.info(`[RSS Monitor] Parsing source: ${source.name} (${source.url})`);
        
        // Parse source in background (don't await to allow parallel parsing)
        parseRssSource(source.id, source.url, source.userId)
          .then(() => {
            parsedCount++;
            logger.info(`[RSS Monitor] ✅ Successfully parsed ${source.name}`);
          })
          .catch((error) => {
            logger.error(`[RSS Monitor] ❌ Failed to parse ${source.name}`, {
              error: error.message,
              sourceId: source.id
            });
          });

        // Small delay between sources to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        logger.error(`[RSS Monitor] Error processing source ${source.name}`, {
          error: error.message,
          sourceId: source.id
        });
      }
    }

    logger.info(`[RSS Monitor] Processing complete: ${parsedCount} parsed, ${skippedCount} skipped`);

  } catch (error: any) {
    logCronJob('rssMonitor', 'failed', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime
    });
    
    logger.error('[RSS Monitor] Error during RSS check', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    isRunning = false;
    const duration = Date.now() - startTime;
    logCronJob('rssMonitor', 'completed', { duration });
    logger.info(`[RSS Monitor] Completed in ${duration}ms`);
  }
}

/**
 * Parse a specific RSS source (can be called manually or from cron)
 */
export async function parseActiveRssSource(sourceId: string, url: string, userId: string) {
  try {
    logger.info(`[RSS Monitor] Parsing source ${sourceId} for user ${userId}`);
    await parseRssSource(sourceId, url, userId);
  } catch (error: any) {
    logger.error(`[RSS Monitor] Failed to parse source ${sourceId}`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}
