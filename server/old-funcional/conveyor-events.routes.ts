/**
 * Conveyor Events SSE Route
 * Streams real-time agent thinking/progress to frontend
 * Also provides endpoint for loading historical events on page refresh
 */
import type { Express, Request, Response } from "express";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { conveyorEvents, type ConveyorEvent, STAGE_NAMES_RU } from "../conveyor/conveyor-events";
import { conveyorLogsStorage } from "../storage/conveyor-logs.storage";
import { logger } from "../lib/logger";

export function registerConveyorEventsRoutes(app: Express) {
  /**
   * GET /api/conveyor/events
   * SSE endpoint for real-time conveyor events
   */
  app.get("/api/conveyor/events", requireAuth, (req: any, res: Response) => {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    logger.info("[SSE] Client connected to conveyor events", { userId });

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Send initial connection event
    const sendEvent = (event: ConveyorEvent) => {
      try {
        const data = JSON.stringify(event);
        res.write(`event: ${event.type}\n`);
        res.write(`data: ${data}\n\n`);
      } catch (error) {
        logger.error("[SSE] Error sending event", { userId, error });
      }
    };

    // Send heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(": heartbeat\n\n");
      } catch (error) {
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    // Send connection confirmation
    sendEvent({
      type: "agent:message",
      userId,
      itemId: "system",
      timestamp: new Date(),
      data: {
        message: "🔌 Подключено к стриму событий",
      },
    });

    // Listen for user-specific events
    const eventHandler = (event: ConveyorEvent) => {
      sendEvent(event);
    };

    conveyorEvents.on(`user:${userId}`, eventHandler);

    // Cleanup on client disconnect
    req.on("close", () => {
      logger.info("[SSE] Client disconnected from conveyor events", { userId });
      clearInterval(heartbeatInterval);
      conveyorEvents.off(`user:${userId}`, eventHandler);
    });
  });

  /**
   * POST /api/conveyor/events/test
   * Test endpoint to trigger a sample event sequence
   */
  app.post("/api/conveyor/events/test", requireAuth, async (req: any, res: Response) => {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

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

    res.json({ success: true, message: "Test events will be sent over next 12 seconds" });
  });

  /**
   * GET /api/conveyor/events/history
   * Get historical events from database (for page refresh recovery)
   */
  app.get("/api/conveyor/events/history", requireAuth, async (req: any, res: Response) => {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await conveyorLogsStorage.getRecentThinking(userId, limit);

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
      res.json({ events: events.reverse() });
    } catch (error: any) {
      logger.error("[API] Failed to get event history", { error: error.message, userId });
      res.status(500).json({ error: "Failed to get event history" });
    }
  });
}
