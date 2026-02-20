import { Router } from "express";
import { requireAuth } from "../../middleware/jwt-auth";
import { contentExportController } from "./content-export.controller";
import type { Express } from "express";

const router = Router();

router.get(
  "/scripts/:scriptId/export/archive",
  requireAuth,
  contentExportController.downloadArchive
);

export function registerContentExportRoutes(app: Express) {
  app.use("/api", router);
}
