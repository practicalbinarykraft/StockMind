import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { sceneCommentsController } from "./scene-comments.controller";
import type { Express } from "express";

const router = Router();

// Create a new comment
router.post("/", requireAuth, sceneCommentsController.createComment);

// Get all comments for a script
router.get("/:scriptId", requireAuth, sceneCommentsController.getScriptComments);

// Get comments for a specific scene
router.get(
  "/:scriptId/scenes/:sceneId",
  requireAuth,
  sceneCommentsController.getSceneComments
);

// Delete a comment
router.delete("/:id", requireAuth, sceneCommentsController.deleteComment);

export function registerSceneCommentsRoutes(app: Express) {
  app.use("/api/scene-comments", router);
}
