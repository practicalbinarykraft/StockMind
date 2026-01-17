import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { heygenController } from "./heygen.controller";
import type { Express } from "express";

const router = Router();

router.get("/heygen/avatars", requireAuth, heygenController.getAvatars);
router.post("/heygen/generate", requireAuth, heygenController.generateVideo);
router.get("/heygen/status/:videoId", requireAuth, heygenController.getVideoStatus);
router.get("/heygen/image-proxy", requireAuth, heygenController.proxyImage);
router.get("/heygen/video-proxy", requireAuth, heygenController.proxyVideo);

export function registerHeygenRoutes(app: Express) {
  app.use("/api", router);
}
