import { ConveyorSettingsRepo } from "./conveyor-settings.repo";
import { logger } from "../../lib/logger";
import type { UpdateSettingsDto } from "./conveyor-settings.dto";

const repo = new ConveyorSettingsRepo();

/**
 * Conveyor Settings Service
 * Business logic for conveyor settings management
 */
export const conveyorSettingsService = {
  /**
   * Get settings for user, create defaults if not exist
   */
  async getSettings(userId: string) {
    let settings = await repo.getByUserId(userId);

    // Create default settings if none exist
    if (!settings) {
      settings = await repo.create(userId);
    }

    // Check if daily counter needs to be reset (new day)
    const wasReset = await repo.checkAndResetDailyCount(userId);
    if (wasReset) {
      // Refetch settings after reset
      settings = await repo.getByUserId(userId);
    }

    return settings;
  },

  /**
   * Update settings for user
   */
  async updateSettings(userId: string, data: UpdateSettingsDto) {
    // Ensure settings exist
    let settings = await repo.getByUserId(userId);
    if (!settings) {
      settings = await repo.create(userId);
    }

    // Update settings
    const updated = await repo.update(userId, data as any);

    logger.info("Conveyor settings updated", {
      userId,
      enabled: data.enabled,
    });

    return updated;
  },

  /**
   * Get statistics for user
   */
  async getStats(userId: string) {
    // Check if daily counter needs to be reset (new day)
    await repo.checkAndResetDailyCount(userId);

    const settings = await repo.getByUserId(userId);

    if (!settings) {
      return {
        totalProcessed: 0,
        totalPassed: 0,
        totalFailed: 0,
        totalApproved: 0,
        totalRejected: 0,
        approvalRate: null,
        itemsProcessedToday: 0,
        dailyLimit: 10,
        currentMonthCost: "0",
        monthlyBudgetLimit: "10.00",
      };
    }

    return {
      totalProcessed: settings.totalProcessed,
      totalPassed: settings.totalPassed,
      totalFailed: settings.totalFailed,
      totalApproved: settings.totalApproved,
      totalRejected: settings.totalRejected,
      approvalRate: settings.approvalRate,
      itemsProcessedToday: settings.itemsProcessedToday,
      dailyLimit: settings.dailyLimit,
      currentMonthCost: settings.currentMonthCost,
      monthlyBudgetLimit: settings.monthlyBudgetLimit,
      learnedThreshold: settings.learnedThreshold,
      avoidedTopics: settings.avoidedTopics,
      preferredFormats: settings.preferredFormats,
    };
  },

  /**
   * Reset learned patterns
   */
  async resetLearning(userId: string) {
    await repo.update(userId, {
      learnedThreshold: null,
      rejectionPatterns: {},
      avoidedTopics: [],
      preferredFormats: [],
    } as any);

    logger.info("Conveyor learning data reset", { userId });

    return { success: true, message: "Learning data has been reset" };
  },

  /**
   * Increment daily script count
   */
  async incrementDailyCount(userId: string) {
    await repo.incrementDailyCount(userId);
  },

  /**
   * Add cost to monthly total
   */
  async addCost(userId: string, cost: number) {
    await repo.addCost(userId, cost);
  },

  /**
   * Increment passed count
   */
  async incrementPassed(userId: string) {
    await repo.incrementPassed(userId);
  },

  /**
   * Increment failed count
   */
  async incrementFailed(userId: string) {
    await repo.incrementFailed(userId);
  },
};
