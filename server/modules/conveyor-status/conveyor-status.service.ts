import { ConveyorStatusRepo } from "./conveyor-status.repo";
import {
  ConveyorItemNotFoundError,
  ConveyorItemAccessDeniedError,
} from "./conveyor-status.errors";

const repo = new ConveyorStatusRepo();

/**
 * Conveyor Status Service
 * Business logic for conveyor status and monitoring
 */
export const conveyorStatusService = {
  /**
   * Get current conveyor status
   */
  async getStatus(userId: string) {
    const settings = await repo.getSettings(userId);
    const pendingCount = await repo.getPendingScriptsCount(userId);
    const processingCount = await repo.getProcessingCount(userId);

    return {
      enabled: settings?.enabled || false,
      isProcessing: processingCount > 0,
      processingCount,
      pendingReviewCount: pendingCount,
      itemsProcessedToday: settings?.itemsProcessedToday || 0,
      dailyLimit: settings?.dailyLimit || 10,
      dailyRemaining: Math.max(
        0,
        (settings?.dailyLimit || 10) - (settings?.itemsProcessedToday || 0)
      ),
      currentMonthCost: settings?.currentMonthCost || "0",
      monthlyBudgetLimit: settings?.monthlyBudgetLimit || "10.00",
      budgetRemaining: (
        parseFloat(settings?.monthlyBudgetLimit?.toString() || "10") -
        parseFloat(settings?.currentMonthCost?.toString() || "0")
      ).toFixed(2),
    };
  },

  /**
   * Get processing history
   */
  async getItems(userId: string, limit: number) {
    return await repo.getItemsByUser(userId, limit);
  },

  /**
   * Get specific item details
   */
  async getItemById(itemId: string, userId: string) {
    const item = await repo.getItemById(itemId);

    if (!item) {
      throw new ConveyorItemNotFoundError();
    }

    if (item.userId !== userId) {
      throw new ConveyorItemAccessDeniedError();
    }

    // Get associated script if exists
    const script = await repo.getScriptByConveyorItem(itemId);

    return {
      ...item,
      script: script || null,
    };
  },

  /**
   * Get failed items
   */
  async getFailedItems(userId: string) {
    return await repo.getFailedItems(userId);
  },

  /**
   * Get conveyor logs
   */
  async getLogs(userId: string, limit: number) {
    return await repo.getLogsByUser(userId, limit);
  },

  /**
   * Get dashboard summary
   */
  async getDashboard(userId: string) {
    const settings = await repo.getSettings(userId);
    const pendingScripts = await repo.getPendingScripts(userId);
    const recentItems = await repo.getItemsByUser(userId, 10);
    const failedItems = await repo.getFailedItems(userId);
    const processingCount = await repo.getProcessingCount(userId);

    // Calculate stats
    const passRate = settings?.totalProcessed
      ? ((settings.totalPassed / settings.totalProcessed) * 100).toFixed(1)
      : "0";

    const approvalRate = settings?.approvalRate
      ? (parseFloat(settings.approvalRate.toString()) * 100).toFixed(1)
      : null;

    return {
      // Status
      enabled: settings?.enabled || false,

      // Today's progress
      todayProgress: {
        processed: settings?.itemsProcessedToday || 0,
        limit: settings?.dailyLimit || 10,
        percentage: Math.round(
          ((settings?.itemsProcessedToday || 0) /
            (settings?.dailyLimit || 10)) *
            100
        ),
      },

      // Budget
      budget: {
        used: settings?.currentMonthCost || "0",
        limit: settings?.monthlyBudgetLimit || "10.00",
        percentage: Math.round(
          (parseFloat(settings?.currentMonthCost?.toString() || "0") /
            parseFloat(settings?.monthlyBudgetLimit?.toString() || "10")) *
            100
        ),
      },

      // Stats
      stats: {
        totalProcessed: settings?.totalProcessed || 0,
        totalPassed: settings?.totalPassed || 0,
        totalFailed: settings?.totalFailed || 0,
        passRate: `${passRate}%`,
        totalApproved: settings?.totalApproved || 0,
        totalRejected: settings?.totalRejected || 0,
        approvalRate: approvalRate ? `${approvalRate}%` : null,
      },

      // Pending review
      pendingReview: {
        count: pendingScripts.length,
        scripts: pendingScripts.slice(0, 5).map((s) => ({
          id: s.id,
          title: s.title,
          formatName: s.formatName,
          finalScore: s.finalScore,
          createdAt: s.createdAt,
        })),
      },

      // Recent activity
      recentItems: recentItems.map((item) => ({
        id: item.id,
        sourceType: item.sourceType,
        status: item.status,
        currentStage: item.currentStage,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        errorMessage: item.errorMessage,
      })),

      // Failed items needing attention
      failedCount: failedItems.length,
      processingCount,

      // Learning
      learning: {
        learnedThreshold: settings?.learnedThreshold,
        avoidedTopicsCount: Array.isArray(settings?.avoidedTopics)
          ? (settings.avoidedTopics as string[]).length
          : 0,
        preferredFormatsCount: Array.isArray(settings?.preferredFormats)
          ? (settings.preferredFormats as string[]).length
          : 0,
      },
    };
  },
};
