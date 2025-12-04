/**
 * Conveyor Progress Routes
 * API endpoints for tracking revision progress
 */
import type { Express } from "express";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { logger } from "../lib/logger";
import { conveyorItemsStorage } from "../storage/conveyor-items.storage";
import { conveyorLogsStorage } from "../storage/conveyor-logs.storage";

export function registerConveyorProgressRoutes(app: Express) {
  /**
   * GET /api/conveyor/items/:id/progress
   * Get progress information for a conveyor item
   */
  app.get("/api/conveyor/items/:id/progress", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const item = await conveyorItemsStorage.getById(id);

      if (!item) {
        return res.status(404).json({ message: "Conveyor item not found" });
      }

      // Check ownership
      if (item.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Parse stage history
      const stageHistory = (item.stageHistory as any[]) || [];
      const currentStage = item.currentStage || 1;
      const status = item.status;

      // Calculate elapsed time
      const startedAt = item.startedAt ? new Date(item.startedAt).getTime() : Date.now();
      const elapsedTime = Math.floor((Date.now() - startedAt) / 1000); // seconds

      // Get completed stages
      const completedStages = stageHistory.filter((s) => s.completed);
      const lastCompletedStage = completedStages[completedStages.length - 1];

      // Calculate progress percentage
      const totalStages = 9; // Scout through Delivery
      const progress = status === "completed"
        ? 100
        : status === "failed"
        ? 0
        : Math.round((completedStages.length / totalStages) * 100);

      // Estimate time remaining (rough estimate)
      const averageTimePerStage = completedStages.length > 0
        ? elapsedTime / completedStages.length
        : 30; // default 30 seconds per stage
      const remainingStages = totalStages - completedStages.length;
      const estimatedTimeRemaining = Math.max(0, Math.round(remainingStages * averageTimePerStage));

      // Get current stage info
      const stageNames: Record<number, string> = {
        1: "Scout",
        2: "Scorer",
        3: "Analyst",
        4: "Architect",
        5: "Writer",
        6: "QC",
        7: "Optimizer",
        8: "Gate",
        9: "Delivery",
      };

      const currentStageName = stageNames[currentStage] || `Stage ${currentStage}`;

      res.json({
        success: true,
        data: {
          currentStage,
          stageName: currentStageName,
          progress,
          elapsedTime,
          estimatedTimeRemaining,
          status,
          stages: stageHistory.map((s) => ({
            stage: s.stage,
            name: stageNames[s.stage] || `Stage ${s.stage}`,
            status: s.completed ? "completed" : s.started ? "processing" : "pending",
            duration: s.duration || 0,
            startedAt: s.startedAt,
            completedAt: s.completedAt,
          })),
          lastCompletedStage: lastCompletedStage
            ? {
                stage: lastCompletedStage.stage,
                name: stageNames[lastCompletedStage.stage] || `Stage ${lastCompletedStage.stage}`,
                completedAt: lastCompletedStage.completedAt,
              }
            : null,
        },
      });
    } catch (error: any) {
      logger.error("Error fetching conveyor progress", {
        userId: getUserId(req),
        itemId: req.params.id,
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  /**
   * GET /api/conveyor/items/:id/logs
   * Get logs for a conveyor item
   */
  app.get("/api/conveyor/items/:id/logs", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const item = await conveyorItemsStorage.getById(id);

      if (!item) {
        return res.status(404).json({ message: "Conveyor item not found" });
      }

      // Check ownership
      if (item.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get logs for this item
      const logs = await conveyorLogsStorage.getByItem(id);

      // Format logs
      const formattedLogs = logs.map((log) => ({
        id: log.id,
        eventType: log.eventType,
        stage: log.stageNumber,
        agent: log.agentName,
        message: log.message || getLogMessage(log.eventType, log.details),
        details: log.details,
        createdAt: log.createdAt,
      }));

      res.json({
        success: true,
        data: formattedLogs,
      });
    } catch (error: any) {
      logger.error("Error fetching conveyor logs", {
        userId: getUserId(req),
        itemId: req.params.id,
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });
}

/**
 * Get human-readable message from log event type
 */
function getLogMessage(eventType: string, details: any): string {
  const messages: Record<string, string> = {
    stage_started: `Начало этапа: ${details?.stageName || "обработка"}`,
    stage_completed: `Этап завершён: ${details?.stageName || "обработка"}`,
    stage_failed: `Ошибка на этапе: ${details?.error || "неизвестная ошибка"}`,
    item_started: "Начало обработки",
    item_completed: "Обработка завершена",
    item_failed: `Обработка завершена с ошибкой: ${details?.error || "неизвестная ошибка"}`,
    script_created: "Сценарий создан",
    script_revised: "Сценарий обновлён после ревизии",
  };

  return messages[eventType] || eventType;
}

