import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { conveyorEventsController } from "./conveyor-events.controller";
import type { Express } from "express";

/**
 * Conveyor Events Routes
 * Defines URL patterns and HTTP methods for conveyor events endpoints
 * Includes SSE streaming for real-time events
 */

const router = Router();

// GET /api/conveyor/events - SSE endpoint for real-time conveyor events
router.get("/events", requireAuth, conveyorEventsController.streamEvents);

// POST /api/conveyor/events/test - Test endpoint to trigger sample event sequence
router.post("/events/test", requireAuth, conveyorEventsController.triggerTestEvents);

// GET /api/conveyor/events/history - Get historical events from database
router.get("/events/history", requireAuth, conveyorEventsController.getEventHistory);

export function registerConveyorEventsRoutes(app: Express) {
  app.use("/api/conveyor", router);
}
