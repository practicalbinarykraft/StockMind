import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { elevenlabsController } from "./elevenlabs.controller";
import type { Express } from "express";

const router = Router();

router.get("/elevenlabs/voices", requireAuth, elevenlabsController.getVoices);
router.post("/elevenlabs/generate", requireAuth, elevenlabsController.generateSpeech);

export function registerElevenlabsRoutes(app: Express) {
  app.use("/api", router);
}
