import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { scriptVersionsController } from "./script-versions.controller";
import type { Express } from "express";

const router = Router();

// Get script history with recommendations
router.get(
  "/:id/script-history",
  requireAuth,
  scriptVersionsController.getScriptHistory
);

// Get all script versions
router.get(
  "/:id/script-versions",
  requireAuth,
  scriptVersionsController.getVersionsList
);

// Get specific version
router.get(
  "/:id/versions/:versionId",
  requireAuth,
  scriptVersionsController.getVersionById
);

// Create initial version from analysis
router.post(
  "/:id/create-initial-version",
  requireAuth,
  scriptVersionsController.createInitialVersion
);

// Accept candidate version
router.put(
  "/:id/versions/:versionId/accept",
  requireAuth,
  scriptVersionsController.acceptVersion
);

// Delete/reject version
router.delete(
  "/:id/versions/:versionId",
  requireAuth,
  scriptVersionsController.deleteVersion
);

export function registerScriptVersionsRoutes(app: Express) {
  app.use("/api/projects", router);
}
