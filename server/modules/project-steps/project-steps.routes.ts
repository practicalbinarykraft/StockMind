import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { projectStepsController } from "./project-steps.controller";
import type { Express } from "express";

const router = Router();

router.get("/projects/:id/steps", requireAuth, projectStepsController.getProjectSteps);
router.post("/projects/:id/steps", requireAuth, projectStepsController.createProjectStep);
router.post("/projects/:id/steps/:stepNumber/skip", requireAuth, projectStepsController.skipProjectStep);

export function registerProjectStepsRoutes(app: Express) {
  app.use("/api", router);
}
