import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { conveyorSettingsController } from "./conveyor-settings.controller";
import type { Express } from "express";

const router = Router();

// GET /api/conveyor/settings - Get current settings
router.get("/settings", requireAuth, conveyorSettingsController.getSettings);

// PUT /api/conveyor/settings - Update settings
router.put("/settings", requireAuth, conveyorSettingsController.updateSettings);

// GET /api/conveyor/stats - Get conveyor statistics
router.get("/stats", requireAuth, conveyorSettingsController.getStats);

// POST /api/conveyor/settings/reset-learning - Reset learned patterns
router.post(
  "/settings/reset-learning",
  requireAuth,
  conveyorSettingsController.resetLearning
);

export function registerConveyorSettingsRoutes(app: Express) {
  app.use("/api/conveyor", router);
}
