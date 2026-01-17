import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { scriptsLibraryController } from "./scripts-library.controller";
import type { Express } from "express";

const scriptsRouter = Router();
const articlesRouter = Router();

// Scripts routes
scriptsRouter.get("/", requireAuth, scriptsLibraryController.getScripts);
scriptsRouter.post("/", requireAuth, scriptsLibraryController.createScript);
scriptsRouter.get("/:id", requireAuth, scriptsLibraryController.getScriptById);
scriptsRouter.patch("/:id", requireAuth, scriptsLibraryController.updateScript);
scriptsRouter.delete("/:id", requireAuth, scriptsLibraryController.deleteScript);
scriptsRouter.post("/:id/analyze", requireAuth, scriptsLibraryController.analyzeScript);
scriptsRouter.post("/:id/start-production", requireAuth, scriptsLibraryController.startProduction);
scriptsRouter.post("/generate-variants", requireAuth, scriptsLibraryController.generateVariants);

// Articles routes (script generation from articles)
articlesRouter.post("/:id/generate-script", requireAuth, scriptsLibraryController.generateScriptFromArticle);

export function registerScriptsLibraryRoutes(app: Express) {
  app.use("/api/scripts", scriptsRouter);
  app.use("/api/articles", articlesRouter);
}
