import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { audioSplittingController } from "./audio-splitting.controller";
import type { Express } from "express";

const router = Router();

router.post(
  "/scripts/:scriptId/audio/split",
  requireAuth,
  audioSplittingController.split
);

export function registerAudioSplittingRoutes(app: Express) {
  app.use("/api", router);
}
