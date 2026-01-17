import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { brollController } from "./broll.controller";
import type { Express } from "express";

const router = Router();

router.post("/projects/:id/broll/generate-prompt", requireAuth, brollController.generatePrompt);
router.post("/projects/:id/broll/generate", requireAuth, brollController.generateBroll);
router.get("/projects/:id/broll/status/:taskId", requireAuth, brollController.getBrollStatus);

export function registerBrollRoutes(app: Express) {
  app.use("/api", router);
}
