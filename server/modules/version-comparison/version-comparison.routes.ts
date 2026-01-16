import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { versionComparisonController } from "./version-comparison.controller";
import type { Express } from "express";

const router = Router();

// Compare two specific versions
router.get("/:id/compare", requireAuth, versionComparisonController.compareVersions);

// Compare current vs latest candidate
router.get(
  "/:id/reanalyze/compare/latest",
  requireAuth,
  versionComparisonController.compareLatest
);

// Choose version to keep
router.post(
  "/:id/reanalyze/compare/choose",
  requireAuth,
  versionComparisonController.chooseVersion
);

// Cancel candidate draft
router.delete(
  "/:id/reanalyze/candidate",
  requireAuth,
  versionComparisonController.cancelCandidate
);

export function registerVersionComparisonRoutes(app: Express) {
  app.use("/api/projects", router);
}
