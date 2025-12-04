import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { insertRssSourceSchema } from "@shared/schema";
import { parseRssSource } from "../lib/rss-background-tasks";

/**
 * RSS sources management routes
 * Handles CRUD operations for RSS feeds and automatic parsing
 */
export function registerRssRoutes(app: Express) {
  // GET /api/settings/rss-sources - Get all RSS sources for current user
  app.get("/api/settings/rss-sources", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const sources = await storage.getRssSources(userId);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching RSS sources:", error);
      res.status(500).json({ message: "Failed to fetch RSS sources" });
    }
  });

  // POST /api/settings/rss-sources - Create new RSS source
  app.post("/api/settings/rss-sources", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = insertRssSourceSchema.parse(req.body);
      const source = await storage.createRssSource(userId, validated);

      // Trigger parsing in background (don't await)
      parseRssSource(source.id, source.url, userId).catch(err =>
        console.error(`Background RSS parsing failed for ${source.id}:`, err)
      );

      res.json(source);
    } catch (error: any) {
      console.error("Error creating RSS source:", error);
      res.status(400).json({ message: error.message || "Failed to create RSS source" });
    }
  });

  // PATCH /api/settings/rss-sources/:id - Update RSS source
  app.patch("/api/settings/rss-sources/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const source = await storage.updateRssSource(id, userId, req.body);

      if (!source) {
        return res.status(404).json({ message: "RSS source not found" });
      }

      res.json(source);
    } catch (error) {
      console.error("Error updating RSS source:", error);
      res.status(500).json({ message: "Failed to update RSS source" });
    }
  });

  // DELETE /api/settings/rss-sources/:id - Delete RSS source
  app.delete("/api/settings/rss-sources/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      await storage.deleteRssSource(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting RSS source:", error);
      res.status(500).json({ message: "Failed to delete RSS source" });
    }
  });

  // POST /api/settings/rss-sources/:id/parse - Manually trigger RSS parsing
  app.post("/api/settings/rss-sources/:id/parse", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      
      // Get source to verify ownership and get URL
      const sources = await storage.getRssSources(userId);
      const source = sources.find(s => s.id === id);
      
      if (!source) {
        return res.status(404).json({ message: "RSS source not found" });
      }

      // Update status to 'parsing'
      await storage.updateRssSource(id, userId, {
        parseStatus: 'parsing',
        parseError: null,
      });

      // Trigger parsing in background (don't await)
      parseRssSource(source.id, source.url, userId).catch(err => {
        console.error(`Manual RSS parsing failed for ${source.id}:`, err);
        // Error will be saved in parseError by parseRssSource
      });

      res.json({ success: true, message: "Parsing started" });
    } catch (error: any) {
      console.error("Error triggering RSS parsing:", error);
      res.status(500).json({ message: error.message || "Failed to trigger parsing" });
    }
  });
}
