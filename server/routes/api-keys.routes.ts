import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { insertApiKeySchema } from "@shared/schema";
import { testApiKeyByProvider } from "../lib/api-key-tester";

/**
 * API Keys management routes
 * Handles CRUD operations for user API keys (OpenAI, Anthropic, ElevenLabs, etc.)
 */
export function registerApiKeysRoutes(app: Express) {
  // GET /api/settings/api-keys - Get all API keys for current user
  app.get("/api/settings/api-keys", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
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
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  // POST /api/settings/api-keys - Create new API key
  app.post("/api/settings/api-keys", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
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
      console.error("Error creating API key:", error);
      res.status(400).json({ message: error.message || "Failed to create API key" });
    }
  });

  // DELETE /api/settings/api-keys/:id - Delete API key
  app.delete("/api/settings/api-keys/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      await storage.deleteApiKey(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // POST /api/settings/api-keys/:id/test - Test API key validity
  app.post("/api/settings/api-keys/:id/test", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;

      // Get the API key from database (with decrypted value)
      const apiKey = await storage.getApiKeyById(id, userId);

      if (!apiKey) {
        return res.status(404).json({ message: "API key not found" });
      }

      // NOTE: apiKey.encryptedKey contains the DECRYPTED key after getApiKeyById()
      const decryptedKey = apiKey.encryptedKey;

      // Test using centralized utility
      const result = await testApiKeyByProvider(apiKey.provider, decryptedKey);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error("Error testing API key:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to test API key"
      });
    }
  });
}
