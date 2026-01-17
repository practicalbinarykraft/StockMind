import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { conveyorTriggerController } from "./conveyor-trigger.controller";
import type { Express } from "express";

/**
 * Conveyor Trigger Routes
 * Defines URL patterns and HTTP methods for conveyor trigger endpoints
 */

const router = Router();

// POST /api/conveyor/trigger - Manually trigger conveyor run
router.post("/trigger", requireAuth, conveyorTriggerController.triggerConveyor);

// POST /api/conveyor/process-item - Process specific item
router.post("/process-item", requireAuth, conveyorTriggerController.processItem);

// POST /api/conveyor/items/:id/retry - Retry failed item
router.post("/items/:id/retry", requireAuth, conveyorTriggerController.retryItem);

// DELETE /api/conveyor/items/:id - Delete/cancel item
router.delete("/items/:id", requireAuth, conveyorTriggerController.deleteItem);

export function registerConveyorTriggerRoutes(app: Express) {
  app.use("/api/conveyor", router);
}
