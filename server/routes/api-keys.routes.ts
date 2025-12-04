import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { insertApiKeySchema } from "@shared/schema";
import { testApiKeyByProvider } from "../lib/api-key-tester";
import { logger } from "../lib/logger";

/**
 * API Keys management routes
 * Handles CRUD operations for user API keys (OpenAI, Anthropic, ElevenLabs, etc.)
 */
export function registerApiKeysRoutes(app: Express) {
  // GET /api/settings/api-keys - Get all API keys for current user
  app.get("/api/settings/api-keys", requireAuth, async (req: any, res) => {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const keys = await storage.getApiKeys(userId);

      // Return only safe fields (never send encryptedKey to client)
      const safeKeys = keys.map(key => ({
        id: key.id,
        provider: key.provider,
        last4: key.last4 || null, // null for legacy keys without last4
        description: key.description,
        isActive: key.isActive,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      }));

      res.json(safeKeys);
    } catch (error: any) {
      // ⚠️ SECURITY: Never log API keys or sensitive error details
      logger.error("Error fetching API keys", {
        userId,
        errorType: error.constructor?.name,
        // Deliberately NOT logging error.message which might contain sensitive data
      });
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  // POST /api/settings/api-keys - Create new API key
  app.post("/api/settings/api-keys", requireAuth, async (req: any, res) => {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = insertApiKeySchema.parse(req.body);
      const apiKey = await storage.createApiKey(userId, validated);

      // Return safe fields only (never send encryptedKey to client)
      const safeApiKey = {
        id: apiKey.id,
        provider: apiKey.provider,
        last4: apiKey.last4 || null,
        description: apiKey.description,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
      };

      res.json(safeApiKey);
    } catch (error: any) {
      // ⚠️ SECURITY: Never log API keys or sensitive error details
      logger.error("Error creating API key", {
        userId,
        provider: req.body?.provider,
        errorType: error.constructor?.name,
        // Deliberately NOT logging error.message or req.body which contains the API key
      });
      res.status(400).json({ message: "Failed to create API key" });
    }
  });

  // DELETE /api/settings/api-keys/:id - Delete API key
  app.delete("/api/settings/api-keys/:id", requireAuth, async (req: any, res) => {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      await storage.deleteApiKey(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      logger.error("Error deleting API key", {
        userId,
        keyId: req.params.id,
        errorType: error.constructor?.name,
      });
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // POST /api/settings/api-keys/:id/test - Test API key validity
  app.post("/api/settings/api-keys/:id/test", requireAuth, async (req: any, res) => {
    let userId: string | null = null;
    const { id } = req.params;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Get the API key from database (with decrypted value)
      const apiKey = await storage.getApiKeyById(id, userId);

      if (!apiKey) {
        return res.status(404).json({ message: "API key not found" });
      }

      // Get decrypted key from the dedicated field
      const decryptedKey = apiKey.decryptedKey;

      // Test using centralized utility
      const result = await testApiKeyByProvider(apiKey.provider, decryptedKey);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      logger.error("Error testing API key", {
        userId,
        keyId: id,
        errorType: error.constructor?.name,
      });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to test API key"
      });
    }
  });
}
