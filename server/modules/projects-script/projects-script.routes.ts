import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { projectsScriptController } from "./projects-script.controller";
import type { Express } from "express";

const router = Router();

// POST /api/projects/:id/generate-script - Генерация скрипта для проекта
router.post("/:id/generate-script", requireAuth, projectsScriptController.generateScript);

export function registerGenerateScriptRoute(app: Express) {
  app.use('/api/projects', router);
}
