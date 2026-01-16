import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { conveyorStatusController } from "./conveyor-status.controller";
import type { Express } from "express";

/**
 * Conveyor Status Routes
 * Defines URL patterns and HTTP methods for conveyor status endpoints
 */

const router = Router();

// GET /api/conveyor/status - Get current conveyor status
router.get("/status", requireAuth, conveyorStatusController.getStatus);

// GET /api/conveyor/items - Get processing history
router.get("/items", requireAuth, conveyorStatusController.getItems);

// GET /api/conveyor/items/:id - Get specific item details
router.get("/items/:id", requireAuth, conveyorStatusController.getItemById);

// GET /api/conveyor/failed - Get failed items
router.get("/failed", requireAuth, conveyorStatusController.getFailedItems);

// GET /api/conveyor/logs - Get conveyor logs
router.get("/logs", requireAuth, conveyorStatusController.getLogs);

// GET /api/conveyor/dashboard - Get dashboard summary
router.get("/dashboard", requireAuth, conveyorStatusController.getDashboard);

export function registerConveyorStatusRoutes(app: Express) {
  app.use("/api/conveyor", router);
}
