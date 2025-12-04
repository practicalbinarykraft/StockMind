/**
 * Conveyor Runner Cron Job
 * Periodically runs the conveyor pipeline for enabled users
 */
import cron from "node-cron";
import { logger } from "../lib/logger";
import { conveyorSettingsStorage } from "../storage/conveyor-settings.storage";
import { conveyorItemsStorage } from "../storage/conveyor-items.storage";
import { conveyorLogsStorage } from "../storage/conveyor-logs.storage";
import { conveyorOrchestrator } from "../conveyor/conveyor-orchestrator";
import { scoutAgent } from "../conveyor/agents";
import { storage } from "../storage";
import type { SourceData } from "../conveyor/types";
import { conveyorEvents } from "../conveyor/conveyor-events";

let isRunning = false;

/**
 * Initialize the conveyor runner cron job
 */
export function initConveyorRunner() {
  // Run every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    if (isRunning) {
      logger.info("[Conveyor Runner] Already running, skipping");
      return;
    }

    isRunning = true;
    logger.info("[Conveyor Runner] Starting...");

    try {
      await runConveyor();
    } catch (error: any) {
      logger.error("[Conveyor Runner] Error", { error: error.message });
    } finally {
      isRunning = false;
    }
  });

  // Reset daily counts at midnight UTC
  cron.schedule("0 0 * * *", async () => {
    const resetTime = new Date();
    logger.info("[Conveyor Runner] Resetting daily counts", {
      timezone: process.env.CRON_TZ || 'UTC',
      resetTime: resetTime.toISOString(),
    });
    await conveyorSettingsStorage.resetDailyCounts();
  }, {
    timezone: process.env.CRON_TZ || 'UTC'
  });

  // Reset monthly costs on 1st of month UTC
  cron.schedule("0 0 1 * *", async () => {
    const resetTime = new Date();
    logger.info("[Conveyor Runner] Resetting monthly costs", {
      timezone: process.env.CRON_TZ || 'UTC',
      resetTime: resetTime.toISOString(),
    });
    await conveyorSettingsStorage.resetMonthlyCosts();
  }, {
    timezone: process.env.CRON_TZ || 'UTC'
  });

  logger.info("[Conveyor Runner] Initialized");
}

/**
 * Main conveyor run function
 */
async function runConveyor(): Promise<void> {
  // Clean up stuck items first (stuck for more than 60 minutes)
  try {
    const stuckCount = await conveyorItemsStorage.markStuckItemsAsFailed(60);
    if (stuckCount > 0) {
      logger.warn(`[Conveyor Runner] Marked ${stuckCount} stuck items as failed`);
    }
  } catch (error: any) {
    logger.error("[Conveyor Runner] Failed to clean up stuck items", { error: error.message });
  }

  // Get all users with enabled conveyor
  const enabledUsers = await conveyorSettingsStorage.getEnabledUsers();

  if (enabledUsers.length === 0) {
    logger.info("[Conveyor Runner] No enabled users");
    return;
  }

  logger.info(`[Conveyor Runner] Processing ${enabledUsers.length} users`);

  for (const settings of enabledUsers) {
    try {
      await processUserConveyor(settings.userId, settings);
    } catch (error: any) {
      logger.error("[Conveyor Runner] User processing error", {
        userId: settings.userId,
        error: error.message,
      });
    }
  }
}

/**
 * Process conveyor for a single user
 */
async function processUserConveyor(
  userId: string,
  settings: any
): Promise<void> {
  // Check budget limit first (priority over daily limit)
  const monthlyBudget = Number(settings.monthlyBudgetLimit);
  const currentCost = Number(settings.currentMonthCost);

  if (currentCost >= monthlyBudget) {
    logger.info(`[Conveyor Runner] User ${userId} budget limit reached`);
    await conveyorLogsStorage.logLimitReached(userId, "budget");
    return;
  }

  // Check daily limit
  if (settings.itemsProcessedToday >= settings.dailyLimit) {
    logger.info(`[Conveyor Runner] User ${userId} daily limit reached`);
    await conveyorLogsStorage.logLimitReached(userId, "daily");
    return;
  }

  // Get user's API key
  const apiKeyRecord = await storage.getUserApiKey(userId, "anthropic");
  if (!apiKeyRecord) {
    logger.warn(`[Conveyor Runner] User ${userId} has no API key`);
    return;
  }

  // Scout for new content
  const scoutResult = await scoutAgent.process(
    { settings },
    { userId, itemId: "scout", apiKey: apiKeyRecord.decryptedKey }
  );

  if (!scoutResult.success || !scoutResult.data) {
    logger.error(`[Conveyor Runner] Scout failed for user ${userId}`);
    return;
  }

  const { items } = scoutResult.data;

  if (items.length === 0) {
    logger.info(`[Conveyor Runner] No new items for user ${userId}`);
    return;
  }

  logger.info(`[Conveyor Runner] Found ${items.length} items for user ${userId}`);

  // Calculate how many we can process
  const remainingDaily = settings.dailyLimit - settings.itemsProcessedToday;
  const estimatedCostPerItem = 0.14;
  const remainingBudget = monthlyBudget - currentCost;
  const remainingByBudget = Math.floor(remainingBudget / estimatedCostPerItem);
  const maxToProcess = Math.min(remainingDaily, remainingByBudget, items.length);

  if (maxToProcess <= 0) {
    logger.info(`[Conveyor Runner] No capacity for user ${userId}`);
    return;
  }

  // Process items
  let processed = 0;
  let skipped = 0;
  for (const sourceData of items.slice(0, maxToProcess)) {
    // Check if already processed
    const exists = await conveyorItemsStorage.exists(
      sourceData.type,
      sourceData.itemId,
      userId
    );

    if (exists) {
      skipped++;
      continue;
    }

    // Process through pipeline
    const result = await conveyorOrchestrator.processItem(
      userId,
      sourceData,
      apiKeyRecord.decryptedKey
    );

    if (result.success) {
      processed++;
      // Update daily count and cost
      await conveyorSettingsStorage.incrementDailyCount(userId);
      await conveyorSettingsStorage.addCost(userId, estimatedCostPerItem);
    } else {
      logger.warn(`[Conveyor Runner] Item failed for user ${userId}`, {
        error: result.error,
        sourceType: sourceData.type,
        sourceItemId: sourceData.itemId,
        itemId: result.itemId,
      });
    }

    // Re-check limits after each item
    const updatedSettings = await conveyorSettingsStorage.getSettings(userId);
    if (!updatedSettings) break;

    if (updatedSettings.itemsProcessedToday >= updatedSettings.dailyLimit) {
      logger.info(`[Conveyor Runner] User ${userId} hit daily limit during processing`);
      break;
    }

    if (Number(updatedSettings.currentMonthCost) >= Number(updatedSettings.monthlyBudgetLimit)) {
      logger.info(`[Conveyor Runner] User ${userId} hit budget limit during processing`);
      break;
    }
  }

  // Log and notify about skipped items
  if (skipped > 0) {
    logger.info(`[Conveyor Runner] Skipped ${skipped} already processed items for user ${userId}`);

    if (processed === 0) {
      // All items were skipped - notify user (stage 1 = Scout)
      conveyorEvents.stageThinking(
        userId,
        "scout-runner",
        1,
        `⏭️ Все ${skipped} найденных статей уже были обработаны ранее. Ожидание новых материалов...`
      );
    }
  }

  logger.info(`[Conveyor Runner] Processed ${processed} items for user ${userId}`, {
    processed,
    skipped,
    total: items.length,
  });
}

/**
 * Manually trigger conveyor for a user (for API endpoint)
 */
export async function triggerConveyorForUser(userId: string): Promise<{
  success: boolean;
  processed: number;
  error?: string;
}> {
  const settings = await conveyorSettingsStorage.getSettings(userId);

  if (!settings) {
    return { success: false, processed: 0, error: "Settings not found" };
  }

  if (!settings.enabled) {
    return { success: false, processed: 0, error: "Conveyor not enabled" };
  }

  try {
    await processUserConveyor(userId, settings);
    return { success: true, processed: 1 };
  } catch (error: any) {
    return { success: false, processed: 0, error: error.message };
  }
}

/**
 * Process a specific item manually (for API endpoint)
 */
export async function processSpecificItem(
  userId: string,
  sourceType: "news" | "instagram",
  sourceItemId: string
): Promise<{ success: boolean; itemId?: string; scriptId?: string; error?: string }> {
  const settings = await conveyorSettingsStorage.getSettings(userId);

  if (!settings) {
    return { success: false, error: "Settings not found" };
  }

  // Check limits
  if (Number(settings.currentMonthCost) >= Number(settings.monthlyBudgetLimit)) {
    return { success: false, error: "Monthly budget limit reached" };
  }

  if (settings.itemsProcessedToday >= settings.dailyLimit) {
    return { success: false, error: "Daily limit reached" };
  }

  // Get API key
  const apiKeyRecord = await storage.getUserApiKey(userId, "anthropic");
  if (!apiKeyRecord) {
    return { success: false, error: "API key not configured" };
  }

  // Check if already processed
  const exists = await conveyorItemsStorage.exists(
    sourceType,
    sourceItemId,
    userId
  );

  if (exists) {
    return { success: false, error: "Item already processed" };
  }

  // Get source data
  let sourceData: SourceData | null = null;

  if (sourceType === "news") {
    const rssItem = await storage.getRssItemById(sourceItemId);
    if (rssItem) {
      sourceData = {
        type: "news",
        itemId: rssItem.id,
        title: rssItem.title,
        content: rssItem.fullContent || rssItem.content || "",
        url: rssItem.url,
        publishedAt: rssItem.publishedAt || new Date(),
        imageUrl: rssItem.imageUrl || undefined,
      };
    }
  }

  if (!sourceData) {
    return { success: false, error: "Source item not found" };
  }

  // Process
  const result = await conveyorOrchestrator.processItem(
    userId,
    sourceData,
    apiKeyRecord.decryptedKey
  );

  if (result.success) {
    await conveyorSettingsStorage.incrementDailyCount(userId);
    await conveyorSettingsStorage.addCost(userId, 0.14);
  }

  return result;
}
