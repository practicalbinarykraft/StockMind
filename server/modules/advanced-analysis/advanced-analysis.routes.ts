import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { advancedAnalysisController } from "./advanced-analysis.controller";
import type { Express } from "express";

const router = Router();

router.post("/analyze/advanced/news", requireAuth, advancedAnalysisController.analyzeNews);
router.post("/analyze/advanced/reel", requireAuth, advancedAnalysisController.analyzeReel);
router.post("/analyze/advanced/script", requireAuth, advancedAnalysisController.analyzeScript);
router.post("/analyze/compare", requireAuth, advancedAnalysisController.compareAnalysis);

export function registerAdvancedAnalysisRoutes(app: Express) {
  app.use("/api", router);
}
