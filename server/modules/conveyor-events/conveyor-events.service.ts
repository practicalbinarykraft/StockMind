import { ConveyorEventsRepo } from "./conveyor-events.repo";
import { conveyorEvents, type ConveyorEvent, STAGE_NAMES_RU } from "../../conveyor/conveyor-events";
import { EventHistoryFetchError } from "./conveyor-events.errors";
import { logger } from "../../lib/logger";

const repo = new ConveyorEventsRepo();

/**
 * Conveyor Events Service
 * Business logic for conveyor events and SSE streaming
 */
export const conveyorEventsService = {
  /**
   * Get historical events from database
   */
  async getEventHistory(userId: string, limit: number) {
    try {
      const logs = await repo.getRecentThinking(userId, limit);

      // Convert DB logs to ConveyorEvent format for frontend compatibility
      const events: ConveyorEvent[] = logs.map((log) => ({
        type: "stage:thinking" as const,
        userId: log.userId,
        itemId: log.conveyorItemId || "unknown",
        timestamp: log.createdAt,
        data: {
          stage: log.stageNumber || undefined,
          stageName: log.agentName || (log.stageNumber ? STAGE_NAMES_RU[log.stageNumber] : undefined),
          message: (log.details as any)?.message || log.agentName || "Event",
          thinking: (log.details as any)?.message,
        },
      }));

      // Return in chronological order (oldest first)
      return events.reverse();
    } catch (error: any) {
      logger.error("Failed to get event history", { error: error.message, userId });
      throw new EventHistoryFetchError();
    }
  },

  /**
   * Simulate test event sequence
   */
  async triggerTestEvents(userId: string) {
    const testItemId = `test-${Date.now()}`;

    // Simulate event sequence
    setTimeout(() => {
      conveyorEvents.itemStarted(userId, testItemId, "Тестовая новость о технологиях");
    }, 0);

    setTimeout(() => {
      conveyorEvents.stageStarted(userId, testItemId, 2);
    }, 500);

    setTimeout(() => {
      conveyorEvents.stageThinking(userId, testItemId, 2, "Анализирую вирусный потенциал...");
    }, 1000);

    setTimeout(() => {
      conveyorEvents.stageThinking(userId, testItemId, 2, "Нашёл интересные факты о рынке");
    }, 2000);

    setTimeout(() => {
      conveyorEvents.stageCompleted(userId, testItemId, 2, { score: 85, verdict: "viral" });
    }, 3000);

    setTimeout(() => {
      conveyorEvents.stageStarted(userId, testItemId, 3);
    }, 3500);

    setTimeout(() => {
      conveyorEvents.agentMessage(userId, testItemId, 3, "Консультируюсь с Архитектором о структуре...");
    }, 4000);

    setTimeout(() => {
      conveyorEvents.stageThinking(userId, testItemId, 3, "Выделяю ключевые факты и цифры");
    }, 4500);

    setTimeout(() => {
      conveyorEvents.stageCompleted(userId, testItemId, 3);
    }, 5000);

    setTimeout(() => {
      conveyorEvents.stageStarted(userId, testItemId, 4);
    }, 5500);

    setTimeout(() => {
      conveyorEvents.stageThinking(userId, testItemId, 4, "Проектирую структуру на 60 секунд");
    }, 6000);

    setTimeout(() => {
      conveyorEvents.agentMessage(userId, testItemId, 4, "Выбираю формат: динамичный старт с хуком");
    }, 6500);

    setTimeout(() => {
      conveyorEvents.stageCompleted(userId, testItemId, 4);
    }, 7000);

    setTimeout(() => {
      conveyorEvents.stageStarted(userId, testItemId, 5);
    }, 7500);

    setTimeout(() => {
      conveyorEvents.stageThinking(userId, testItemId, 5, "Пишу сценарий по структуре...");
    }, 8000);

    setTimeout(() => {
      conveyorEvents.stageCompleted(userId, testItemId, 5);
    }, 9000);

    setTimeout(() => {
      conveyorEvents.stageStarted(userId, testItemId, 6);
    }, 9500);

    setTimeout(() => {
      conveyorEvents.stageThinking(userId, testItemId, 6, "Проверяю качество и соответствие...");
    }, 10000);

    setTimeout(() => {
      conveyorEvents.stageCompleted(userId, testItemId, 6);
    }, 11000);

    setTimeout(() => {
      conveyorEvents.itemCompleted(userId, testItemId, "script-demo-123");
    }, 12000);

    return {
      success: true,
      message: "Test events will be sent over next 12 seconds",
    };
  },
};
