import cron from 'node-cron';
import { storage } from '../storage';
import { logger } from '../lib/logger';
import { AnalyticsScraper, calculateEngagementRate } from '../services/analytics-scraper';

/**
 * Process analytics fetch queue
 */
async function processAnalyticsQueue() {
  try {
    const pendingTasks = await storage.getPendingTasks();
    
    if (pendingTasks.length === 0) {
      return;
    }

    logger.info(`[Analytics Cron] Processing ${pendingTasks.length} pending tasks`);

    for (const { task, analytics } of pendingTasks) {
      try {
        // Update task status to processing
        await storage.updateFetchTask(task.id, {
          status: 'processing',
          startedAt: new Date(),
        });

        // Get user's Apify API key
        const apifyKey = await storage.getUserApiKey(analytics.userId, 'apify');
        if (!apifyKey) {
          throw new Error('Apify API key not configured');
        }

        // Fetch stats
        const scraper = new AnalyticsScraper(apifyKey.decryptedKey);
        const stats = await scraper.fetchPostStats(
          analytics.platform as 'instagram' | 'tiktok' | 'youtube',
          analytics.postUrl
        );

        // Calculate engagement rate
        const engagementRate = calculateEngagementRate(stats);

        // Create snapshot
        await storage.createSnapshot({
          analyticsId: analytics.id,
          views: stats.views,
          likes: stats.likes,
          comments: stats.comments,
          shares: stats.shares,
          saves: stats.saves,
          reach: stats.reach,
          impressions: stats.impressions,
          plays: stats.plays,
          watchTimeSeconds: stats.watchTimeSeconds,
          engagementRate: engagementRate.toString(),
        });

        // Update analytics
        const nextFetchAt = new Date();
        nextFetchAt.setHours(nextFetchAt.getHours() + analytics.updateIntervalHours);

        await storage.updateAnalytics(analytics.id, {
          lastFetchedAt: new Date(),
          nextFetchAt,
          status: 'active',
          lastError: null,
        });

        // Schedule next fetch
        await storage.createFetchTask(analytics.id, nextFetchAt);

        // Complete task
        await storage.updateFetchTask(task.id, {
          status: 'completed',
          completedAt: new Date(),
          apifyRunId: `run_${Date.now()}`,
        });

        logger.info(`[Analytics Cron] Successfully updated analytics ${analytics.id}`);
      } catch (error: any) {
        logger.error(`[Analytics Cron] Error processing task ${task.id}:`, error);

        // Update task with error
        await storage.updateFetchTask(task.id, {
          status: 'failed',
          errorMessage: error.message,
          retryCount: (task.retryCount || 0) + 1,
        });

        // Update analytics with error
        await storage.updateAnalytics(analytics.id, {
          status: 'error',
          lastError: error.message,
        });

        // Retry after 1 hour if less than 3 attempts
        if ((task.retryCount || 0) < 3) {
          const retryAt = new Date();
          retryAt.setHours(retryAt.getHours() + 1);
          await storage.createFetchTask(analytics.id, retryAt);
        }
      }
    }
  } catch (error: any) {
    logger.error('[Analytics Cron] Error processing queue:', error);
  }
}

/**
 * Schedule analytics updates
 */
async function scheduleDueAnalytics() {
  try {
    const dueAnalytics = await storage.getDueAnalytics();

    if (dueAnalytics.length === 0) {
      return;
    }

    logger.info(`[Analytics Cron] Scheduling ${dueAnalytics.length} analytics updates`);

    for (const analytics of dueAnalytics) {
      // Check if there's already a pending task
      const pendingTasks = await storage.getPendingTasks();
      const hasPendingTask = pendingTasks.some(t => t.analytics.id === analytics.id);

      if (!hasPendingTask) {
        await storage.createFetchTask(analytics.id, new Date());
        logger.info(`[Analytics Cron] Scheduled fetch for analytics ${analytics.id}`);
      }
    }
  } catch (error: any) {
    logger.error('[Analytics Cron] Error scheduling analytics:', error);
  }
}

/**
 * Initialize analytics updater cron job
 * Runs every 15 minutes
 */
export function initAnalyticsUpdater() {
  // Schedule due analytics and process queue every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('[Analytics Cron] Starting analytics update check...');
    
    try {
      // First, schedule any due analytics
      await scheduleDueAnalytics();
      
      // Then, process the queue
      await processAnalyticsQueue();
    } catch (error: any) {
      logger.error('[Analytics Cron] Error in cron job:', error);
    }
  });

  logger.info('[Analytics Cron] Analytics updater cron job initialized (runs every 15 minutes)');
}

