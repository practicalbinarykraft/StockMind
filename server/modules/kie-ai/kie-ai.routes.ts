import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { kieAiController } from "./kie-ai.controller";
import type { Express } from "express";

const router = Router();

router.post("/kie-ai/generate-image", requireAuth, kieAiController.generateImage);
router.post("/kie-ai/generate-video", requireAuth, kieAiController.generateVideo);
router.post("/kie-ai/image-to-video", requireAuth, kieAiController.imageToVideo);
router.get("/kie-ai/jobs/:jobId/status", requireAuth, kieAiController.getJobStatus);
router.post("/kie-ai/webhook", kieAiController.webhook); // без auth для входящих callback от Kie.ai

export function registerKieAiRoutes(app: Express) {
  app.use("/api", router);
}
