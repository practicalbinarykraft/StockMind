import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { instagramItemsController } from "./instagram-items.controller";
import type { Express } from "express";

const router = Router();

router.get("/items", requireAuth, instagramItemsController.getInstagramItems);
router.get("/items/:id", requireAuth, instagramItemsController.getInstagramItemById);
router.patch("/items/:id/action", requireAuth, instagramItemsController.updateItemAction);
router.post("/items/:id/transcribe", requireAuth, instagramItemsController.transcribeItem);
router.post("/items/:id/score", requireAuth, instagramItemsController.scoreItem);
router.get("/proxy-image", requireAuth, instagramItemsController.proxyImage);

export function registerInstagramItemsRoutes(app: Express) {
  app.use("/api/instagram", router);
}
