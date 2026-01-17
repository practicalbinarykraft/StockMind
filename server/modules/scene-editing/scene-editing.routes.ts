import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { sceneEditingController } from "./scene-editing.controller";
import type { Express } from "express";

const router = Router();

// Get scene recommendations
router.get(
  "/:id/scene-recommendations",
  requireAuth,
  sceneEditingController.getSceneRecommendations
);

// Apply single scene recommendation
router.post(
  "/:id/apply-scene-recommendation",
  requireAuth,
  sceneEditingController.applySceneRecommendation
);

// Apply all recommendations
router.post(
  "/:id/apply-all-recommendations",
  requireAuth,
  sceneEditingController.applyAllRecommendations
);

// Edit scene manually
router.post("/:id/edit-scene", requireAuth, sceneEditingController.editScene);

// Revert to version
router.post(
  "/:id/revert-to-version",
  requireAuth,
  sceneEditingController.revertToVersion
);

// Run analysis
router.post("/:id/analysis/run", requireAuth, sceneEditingController.runAnalysis);

export function registerSceneEditingRoutes(app: Express) {
  app.use("/api/projects", router);
}
