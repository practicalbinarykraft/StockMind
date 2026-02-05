import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { scriptsLibraryController } from "./scripts-library.controller";
import type { Express } from "express";

const scriptsRouter = Router();
const articlesRouter = Router();

// ============================================================================
// STATIC ROUTES (must be defined BEFORE parameterized routes like :id)
// ============================================================================

// Autosave endpoint (for beacon requests on page unload)
scriptsRouter.post("/autosave", requireAuth, scriptsLibraryController.autosave);

// Generate variants
scriptsRouter.post("/generate-variants", requireAuth, scriptsLibraryController.generateVariants);

// ============================================================================
// PARAMETERIZED ROUTES (must come AFTER static routes)
// ============================================================================

// Scripts routes
scriptsRouter.get("/", requireAuth, scriptsLibraryController.getScripts);
scriptsRouter.post("/", requireAuth, scriptsLibraryController.createScript);
scriptsRouter.get("/:id", requireAuth, scriptsLibraryController.getScriptById);
scriptsRouter.patch("/:id", requireAuth, scriptsLibraryController.updateScript);
scriptsRouter.delete("/:id", requireAuth, scriptsLibraryController.deleteScript);
scriptsRouter.get("/:id/versions", requireAuth, scriptsLibraryController.getScriptVersions);
scriptsRouter.post("/:id/create-version", requireAuth, scriptsLibraryController.createScriptVersion);
scriptsRouter.post("/:id/analyze", requireAuth, scriptsLibraryController.analyzeScript);
scriptsRouter.post("/:id/start-production", requireAuth, scriptsLibraryController.startProduction);

// Editor state and checkpoint routes
scriptsRouter.post("/:id/save", requireAuth, scriptsLibraryController.saveWorkingState);
scriptsRouter.post("/:id/checkpoint", requireAuth, scriptsLibraryController.createCheckpoint);
scriptsRouter.get("/:id/checkpoints", requireAuth, scriptsLibraryController.getCheckpoints);
scriptsRouter.post("/:id/restore-checkpoint", requireAuth, scriptsLibraryController.restoreFromCheckpoint);
scriptsRouter.post("/:id/operation-log", requireAuth, scriptsLibraryController.logOperation);
scriptsRouter.get("/:id/operation-log", requireAuth, scriptsLibraryController.getOperationLog);

// Articles routes (script generation from articles)
articlesRouter.post("/:id/generate-script", requireAuth, scriptsLibraryController.generateScriptFromArticle);

export function registerScriptsLibraryRoutes(app: Express) {
  app.use("/api/scripts", scriptsRouter);
  app.use("/api/articles", articlesRouter);
}
