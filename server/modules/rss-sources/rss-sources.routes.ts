import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { rssSourcesController } from "./rss-sources.controller";
import type { Express } from "express";

const router = Router();

router.get("/rss-sources", requireAuth, rssSourcesController.getRssSources);
router.post("/rss-sources", requireAuth, rssSourcesController.createRssSource);
router.patch("/rss-sources/:id", requireAuth, rssSourcesController.updateRssSource);
router.delete("/rss-sources/:id", requireAuth, rssSourcesController.deleteRssSource);
router.post("/rss-sources/:id/parse", requireAuth, rssSourcesController.triggerParsing);

export function registerRssRoutes(app: Express) {
  app.use("/api/settings", router);
}
