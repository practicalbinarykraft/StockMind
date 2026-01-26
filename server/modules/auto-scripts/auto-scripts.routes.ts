import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { autoScriptsController } from "./auto-scripts.controller";
import type { Express } from "express";

const router = Router();

// ============================================================================
// STATIC ROUTES (must be defined BEFORE parameterized routes like :id)
// ============================================================================

// GET /api/auto-scripts/rejection-categories - Get available categories
router.get(
  "/rejection-categories",
  requireAuth,
  autoScriptsController.getRejectionCategories
);

// GET /api/auto-scripts/writing-profile - Get user's writing profile
router.get(
  "/writing-profile",
  requireAuth,
  autoScriptsController.getWritingProfile
);

// POST /api/auto-scripts/writing-profile/regenerate - Regenerate AI summary
router.post(
  "/writing-profile/regenerate",
  requireAuth,
  autoScriptsController.regenerateWritingProfileSummary
);

// GET /api/auto-scripts/feedback-history - Get user's feedback history
router.get(
  "/feedback-history",
  requireAuth,
  autoScriptsController.getFeedbackHistory
);

// GET /api/auto-scripts/pending/count - Get pending scripts count
router.get(
  "/pending/count",
  requireAuth,
  autoScriptsController.getPendingCount
);

// ============================================================================
// PARAMETERIZED ROUTES (must come AFTER static routes)
// ============================================================================

// GET /api/auto-scripts - Get all scripts for current user
router.get("/", requireAuth, autoScriptsController.getScripts);

// GET /api/auto-scripts/:id - Get specific script
router.get("/:id", requireAuth, autoScriptsController.getScriptById);

// PATCH /api/auto-scripts/:id - Update script content (manual edits)
router.patch("/:id", requireAuth, autoScriptsController.updateScript);

// POST /api/auto-scripts/:id/approve - Approve script and create project
router.post("/:id/approve", requireAuth, autoScriptsController.approveScript);

// POST /api/auto-scripts/:id/reject - Reject script
router.post("/:id/reject", requireAuth, autoScriptsController.rejectScript);

// GET /api/auto-scripts/:id/versions - Get version history
router.get("/:id/versions", requireAuth, autoScriptsController.getScriptVersions);

// POST /api/auto-scripts/:id/revise - Request revision
router.post("/:id/revise", requireAuth, autoScriptsController.reviseScript);

// POST /api/auto-scripts/:id/reset-revision - Reset a stuck revision
router.post(
  "/:id/reset-revision",
  requireAuth,
  autoScriptsController.resetRevision
);

export function registerAutoScriptsRoutes(app: Express) {
  app.use("/api/auto-scripts", router);
}
