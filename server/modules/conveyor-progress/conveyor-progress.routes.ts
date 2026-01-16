import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { conveyorProgressController } from "./conveyor-progress.controller";
import type { Express } from "express";

/**
 * Conveyor Progress Routes
 * Defines URL patterns and HTTP methods for conveyor progress endpoints
 */

const router = Router();

// GET /api/conveyor/items/:id/progress - Get progress information for a conveyor item
router.get("/items/:id/progress", requireAuth, conveyorProgressController.getItemProgress);

// GET /api/conveyor/items/:id/logs - Get logs for a conveyor item
router.get("/items/:id/logs", requireAuth, conveyorProgressController.getItemLogs);

export function registerConveyorProgressRoutes(app: Express) {
  app.use("/api/conveyor", router);
}
