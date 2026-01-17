import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { apiKeysController } from "./api-keys.controller";
import type { Express } from "express";


const router = Router();

router.post("/api-keys", requireAuth, apiKeysController.createApiKey) 
router.get("/api-keys", requireAuth, apiKeysController.getApiKeys)
router.delete("/api-keys/:id", requireAuth, apiKeysController.deleteApiKey)
router.post("/api-keys/:id/test", requireAuth, apiKeysController.testApiKey)

export function registerApiKeysRoutes(app: Express) {
    app.use('/api/settings', router);
}