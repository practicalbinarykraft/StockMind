import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { aiSettingsController } from "./ai-settings.controller";
import type { Express } from "express";

const router = Router();

// GET /api/ai-settings - Get AI generation settings
router.get("/", requireAuth, aiSettingsController.getSettings);

// PUT /api/ai-settings - Update AI generation settings
router.put("/", requireAuth, aiSettingsController.updateSettings);

export function registerAiSettingsRoutes(app: Express) {
  app.use("/api/ai-settings", router);
}
