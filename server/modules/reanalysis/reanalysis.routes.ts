import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { reanalysisController } from "./reanalysis.controller";
import type { Express } from "express";

const router = Router();

// Start reanalysis job
router.post(
  "/:id/reanalyze/start",
  requireAuth,
  reanalysisController.startReanalysis
);

// Check job status
router.get(
  "/:id/reanalyze/status",
  requireAuth,
  reanalysisController.getJobStatus
);

export function registerReanalysisRoutes(app: Express) {
  app.use("/api/projects", router);
}
