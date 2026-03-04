import { Router } from "express";
import { requireAuth } from "../../middleware/jwt-auth";
import { backgroundRemovalController } from "./background-removal.controller";
import type { Express } from "express";

const router = Router({ mergeParams: true });

router.post(
  "/scripts/:scriptId/layers/:layerId/remove-background",
  requireAuth,
  backgroundRemovalController.startRemoveBackground,
);

router.get(
  "/scripts/:scriptId/layers/:layerId/remove-background/status",
  requireAuth,
  backgroundRemovalController.getRemoveBackgroundStatus,
);

router.get(
  "/scripts/:scriptId/layers/:layerId/processed-video",
  requireAuth,
  backgroundRemovalController.streamProcessedVideo,
);

export function registerBackgroundRemovalRoutes(app: Express) {
  app.use("/api", router);
}
