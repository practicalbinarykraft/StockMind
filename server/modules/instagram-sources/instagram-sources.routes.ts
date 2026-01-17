import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { instagramSourcesController } from "./instagram-sources.controller";
import type { Express } from "express";

const settingsRouter = Router();
const instagramRouter = Router();

// Settings routes (/api/settings/instagram-sources)
settingsRouter.get("/instagram-sources", requireAuth, instagramSourcesController.getInstagramSources);
settingsRouter.post("/instagram-sources", requireAuth, instagramSourcesController.createInstagramSource);
settingsRouter.delete("/instagram-sources/:id", requireAuth, instagramSourcesController.deleteInstagramSource);

// Instagram routes (/api/instagram/sources)
instagramRouter.get("/sources", requireAuth, instagramSourcesController.getInstagramSources);
instagramRouter.post("/sources/:id/parse", requireAuth, instagramSourcesController.parseInstagramSource);
instagramRouter.post("/sources/:id/check-now", requireAuth, instagramSourcesController.checkNow);
instagramRouter.get("/limits", requireAuth, instagramSourcesController.getLimits);

export function registerInstagramSourcesRoutes(app: Express) {
  app.use("/api/settings", settingsRouter);
  app.use("/api/instagram", instagramRouter);
}
