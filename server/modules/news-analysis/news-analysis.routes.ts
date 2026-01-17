import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { newsAnalysisController } from "./news-analysis.controller";
import type { Express } from "express";

const router = Router();

router.post("/translate", requireAuth, newsAnalysisController.translateArticle);
router.post("/analyze", requireAuth, newsAnalysisController.analyzeArticle);
router.post("/analyze-batch", requireAuth, newsAnalysisController.analyzeBatch);

export function registerNewsAnalysisRoutes(app: Express) {
  app.use("/api/news", router);
}
