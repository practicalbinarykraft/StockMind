/**
 * Conveyor Status Routes
 * Provides status and history of conveyor processing
 */
import type { Express } from "express";
import { conveyorItemsStorage } from "../storage/conveyor-items.storage";
import { conveyorLogsStorage } from "../storage/conveyor-logs.storage";
import { conveyorSettingsStorage } from "../storage/conveyor-settings.storage";
import { autoScriptsStorage } from "../storage/auto-scripts.storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { logger } from "../lib/logger";

export function registerConveyorStatusRoutes(app: Express) {
  // GET /api/conveyor/status - Get current conveyor status
  app.get("/api/conveyor/status", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const settings = await conveyorSettingsStorage.getSettings(userId);
      const pendingCount = await autoScriptsStorage.countPending(userId);
      const processingCount = await conveyorItemsStorage.countProcessing(userId);

      res.json({
        enabled: settings?.enabled || false,
        isProcessing: processingCount > 0,
        processingCount,
        pendingReviewCount: pendingCount,
        itemsProcessedToday: settings?.itemsProcessedToday || 0,
        dailyLimit: settings?.dailyLimit || 10,
        dailyRemaining: Math.max(0, (settings?.dailyLimit || 10) - (settings?.itemsProcessedToday || 0)),
        currentMonthCost: settings?.currentMonthCost || "0",
        monthlyBudgetLimit: settings?.monthlyBudgetLimit || "10.00",
        budgetRemaining: (
          parseFloat(settings?.monthlyBudgetLimit?.toString() || "10") -
          parseFloat(settings?.currentMonthCost?.toString() || "0")
        ).toFixed(2),
      });
    } catch (error: any) {
      logger.error("Error fetching conveyor status", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch status" });
    }
  });

  // GET /api/conveyor/items - Get processing history
  app.get("/api/conveyor/items", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const items = await conveyorItemsStorage.getByUser(userId, limit);

      res.json(items);
    } catch (error: any) {
      logger.error("Error fetching conveyor items", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  // GET /api/conveyor/items/:id - Get specific item details
  app.get("/api/conveyor/items/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const item = await conveyorItemsStorage.getById(id);

      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (item.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get associated script if exists
      const script = await autoScriptsStorage.getByConveyorItem(id);

      res.json({
        ...item,
        script: script || null,
      });
    } catch (error: any) {
      logger.error("Error fetching conveyor item", {
        userId: getUserId(req),
        itemId: req.params.id,
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch item" });
    }
  });

  // GET /api/conveyor/items/failed - Get failed items
  app.get("/api/conveyor/failed", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const items = await conveyorItemsStorage.getFailed(userId);

      res.json(items);
    } catch (error: any) {
      logger.error("Error fetching failed items", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch failed items" });
    }
  });

  // GET /api/conveyor/logs - Get conveyor logs
  app.get("/api/conveyor/logs", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const logs = await conveyorLogsStorage.getByUser(userId, limit);

      res.json(logs);
    } catch (error: any) {
      logger.error("Error fetching conveyor logs", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // GET /api/conveyor/dashboard - Get dashboard summary
  app.get("/api/conveyor/dashboard", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const settings = await conveyorSettingsStorage.getSettings(userId);
      const pendingScripts = await autoScriptsStorage.getPending(userId);
      const recentItems = await conveyorItemsStorage.getByUser(userId, 10);
      const failedItems = await conveyorItemsStorage.getFailed(userId);
      const processingCount = await conveyorItemsStorage.countProcessing(userId);

      // Calculate stats
      const passRate = settings?.totalProcessed
        ? ((settings.totalPassed / settings.totalProcessed) * 100).toFixed(1)
        : "0";

      const approvalRate = settings?.approvalRate
        ? (parseFloat(settings.approvalRate.toString()) * 100).toFixed(1)
        : null;

      res.json({
        // Status
        enabled: settings?.enabled || false,

        // Today's progress
        todayProgress: {
          processed: settings?.itemsProcessedToday || 0,
          limit: settings?.dailyLimit || 10,
          percentage: Math.round(
            ((settings?.itemsProcessedToday || 0) / (settings?.dailyLimit || 10)) * 100
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
      });
    } catch (error: any) {
      logger.error("Error fetching dashboard", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch dashboard" });
    }
  });
}
