import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { aiController } from "./ai.controller";
import type { Express } from "express";

const router = Router();

router.post("/ai/analyze-script", requireAuth, aiController.analyzeScript);
router.post("/ai/score-text", requireAuth, aiController.scoreText);

export function registerAiRoutes(app: Express) {
  app.use("/api", router);
}
