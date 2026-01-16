import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { conveyorEventsService } from "./conveyor-events.service";
import { GetEventHistoryQueryDto } from "./conveyor-events.dto";
import { EventHistoryFetchError } from "./conveyor-events.errors";
import { conveyorEvents, type ConveyorEvent } from "../../conveyor/conveyor-events";

/**
 * Controller for Conveyor Events
 * Handles req/res, SSE streaming, validation, HTTP status codes
 */
export const conveyorEventsController = {
  /**
   * GET /api/conveyor/events
   * SSE endpoint for real-time conveyor events
   */
  async streamEvents(req: Request, res: Response) {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
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
  },

  /**
   * POST /api/conveyor/events/test
   * Test endpoint to trigger a sample event sequence
   */
  async triggerTestEvents(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const result = await conveyorEventsService.triggerTestEvents(userId);

      return res.json(result);
    } catch (error: any) {
      logger.error("Error triggering test events", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to trigger test events" });
    }
  },

  /**
   * GET /api/conveyor/events/history
   * Get historical events from database (for page refresh recovery)
   */
  async getEventHistory(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { limit } = GetEventHistoryQueryDto.parse(req.query);
      const events = await conveyorEventsService.getEventHistory(userId, limit);

      return res.json({ events });
    } catch (error: any) {
      if (error instanceof EventHistoryFetchError) {
        return res.status(500).json({ error: error.message });
      }

      logger.error("Failed to get event history", {
        error: error.message,
        userId: getUserId(req),
      });
      return res.status(500).json({ error: "Failed to get event history" });
    }
  },
};
