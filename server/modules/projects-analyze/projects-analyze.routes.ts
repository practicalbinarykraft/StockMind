import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { projectsAnalyzeController } from "./projects-analyze.controller";
import type { Express } from "express";

const router = Router();

// POST /api/projects/:id/analyze-source - Анализ источника проекта
router.post("/:id/analyze-source", requireAuth, projectsAnalyzeController.analyzeSource);

export function registerAnalyzeSourceRoute(app: Express) {
  app.use('/api/projects', router);
}
