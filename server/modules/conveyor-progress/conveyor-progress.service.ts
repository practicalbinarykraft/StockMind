import { ConveyorProgressRepo } from "./conveyor-progress.repo";
import {
  ConveyorItemNotFoundError,
  ConveyorItemAccessDeniedError,
} from "./conveyor-progress.errors";

const repo = new ConveyorProgressRepo();

// Stage names mapping
const STAGE_NAMES: Record<number, string> = {
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

const TOTAL_STAGES = 9;

/**
 * Conveyor Progress Service
 * Business logic for tracking conveyor item progress
 */
export const conveyorProgressService = {
  /**
   * Get progress information for a conveyor item
   */
  async getItemProgress(itemId: string, userId: string) {
    const item = await repo.getItemById(itemId);

    if (!item) {
      throw new ConveyorItemNotFoundError();
    }

    // Check ownership
    if (item.userId !== userId) {
      throw new ConveyorItemAccessDeniedError();
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
    const progress =
      status === "completed"
        ? 100
        : status === "failed"
        ? 0
        : Math.round((completedStages.length / TOTAL_STAGES) * 100);

    // Estimate time remaining (rough estimate)
    const averageTimePerStage =
      completedStages.length > 0
        ? elapsedTime / completedStages.length
        : 30; // default 30 seconds per stage
    const remainingStages = TOTAL_STAGES - completedStages.length;
    const estimatedTimeRemaining = Math.max(
      0,
      Math.round(remainingStages * averageTimePerStage)
    );

    const currentStageName = STAGE_NAMES[currentStage] || `Stage ${currentStage}`;

    return {
      currentStage,
      stageName: currentStageName,
      progress,
      elapsedTime,
      estimatedTimeRemaining,
      status,
      stages: stageHistory.map((s) => ({
        stage: s.stage,
        name: STAGE_NAMES[s.stage] || `Stage ${s.stage}`,
        status: s.completed ? "completed" : s.started ? "processing" : "pending",
        duration: s.duration || 0,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      })),
      lastCompletedStage: lastCompletedStage
        ? {
            stage: lastCompletedStage.stage,
            name:
              STAGE_NAMES[lastCompletedStage.stage] ||
              `Stage ${lastCompletedStage.stage}`,
            completedAt: lastCompletedStage.completedAt,
          }
        : null,
    };
  },

  /**
   * Get logs for a conveyor item
   */
  async getItemLogs(itemId: string, userId: string) {
    const item = await repo.getItemById(itemId);

    if (!item) {
      throw new ConveyorItemNotFoundError();
    }

    // Check ownership
    if (item.userId !== userId) {
      throw new ConveyorItemAccessDeniedError();
    }

    // Get logs for this item
    const logs = await repo.getLogsByItem(itemId);

    // Format logs
    return logs.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      stage: log.stageNumber,
      agent: log.agentName,
      message: (log as any).message || getLogMessage(log.eventType, log.details),
      details: log.details,
      createdAt: log.createdAt,
    }));
  },
};

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
    item_failed: `Обработка завершена с ошибкой: ${
      details?.error || "неизвестная ошибка"
    }`,
    script_created: "Сценарий создан",
    script_revised: "Сценарий обновлён после ревизии",
  };

  return messages[eventType] || eventType;
}
