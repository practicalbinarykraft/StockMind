// Reference: javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertApiKeySchema, insertRssSourceSchema, insertProjectSchema, insertProjectStepSchema } from "@shared/schema";
import Parser from "rss-parser";
import { scoreNewsItem, analyzeScript } from "./ai-service";
import { fetchVoices, generateSpeech } from "./elevenlabs-service";
import { fetchHeyGenAvatars, generateHeyGenVideo, getHeyGenVideoStatus } from "./heygen-service";

const rssParser = new Parser();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ============================================================================
  // AUTH ROUTES
  // ============================================================================
  
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ============================================================================
  // API KEYS ROUTES
  // ============================================================================

  app.get("/api/settings/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const keys = await storage.getApiKeys(userId);
      res.json(keys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/settings/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertApiKeySchema.parse(req.body);
      const apiKey = await storage.createApiKey(userId, validated);
      res.json(apiKey);
    } catch (error: any) {
      console.error("Error creating API key:", error);
      res.status(400).json({ message: error.message || "Failed to create API key" });
    }
  });

  app.delete("/api/settings/api-keys/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteApiKey(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // ============================================================================
  // RSS SOURCES ROUTES
  // ============================================================================

  app.get("/api/settings/rss-sources", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sources = await storage.getRssSources(userId);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching RSS sources:", error);
      res.status(500).json({ message: "Failed to fetch RSS sources" });
    }
  });

  app.post("/api/settings/rss-sources", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.patch("/api/settings/rss-sources/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.delete("/api/settings/rss-sources/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteRssSource(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting RSS source:", error);
      res.status(500).json({ message: "Failed to delete RSS source" });
    }
  });

  // ============================================================================
  // NEWS / RSS ITEMS ROUTES
  // ============================================================================

  app.get("/api/news", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getRssItems(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching news items:", error);
      res.status(500).json({ message: "Failed to fetch news items" });
    }
  });

  // ============================================================================
  // PROJECTS ROUTES
  // ============================================================================

  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const project = await storage.getProject(id, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(userId, validated);
      res.json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: error.message || "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const project = await storage.updateProject(id, userId, req.body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteProject(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // ============================================================================
  // AI ANALYSIS ROUTES
  // ============================================================================

  app.post("/api/ai/analyze-script", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { format, content } = req.body;

      if (!format || !content) {
        return res.status(400).json({ message: "Format and content are required" });
      }

      // Get user's Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No Anthropic API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[AI] Analyzing script for format: ${format}`);
      const analysis = await analyzeScript(apiKey.encryptedKey, format, content);
      
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing script:", error);
      res.status(500).json({ message: error.message || "Failed to analyze script" });
    }
  });

  // ============================================================================
  // ELEVENLABS ROUTES
  // ============================================================================

  app.get("/api/elevenlabs/voices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user's ElevenLabs API key
      const apiKey = await storage.getUserApiKey(userId, 'elevenlabs');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No ElevenLabs API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[ElevenLabs] Fetching voices for user ${userId}`);
      const voices = await fetchVoices(apiKey.encryptedKey);
      
      res.json(voices);
    } catch (error: any) {
      console.error("Error fetching voices:", error);
      res.status(500).json({ message: error.message || "Failed to fetch voices" });
    }
  });

  app.post("/api/elevenlabs/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { voiceId, text, voiceSettings } = req.body;

      if (!voiceId || !text) {
        return res.status(400).json({ message: "Voice ID and text are required" });
      }

      // Get user's ElevenLabs API key
      const apiKey = await storage.getUserApiKey(userId, 'elevenlabs');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No ElevenLabs API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[ElevenLabs] Generating speech for user ${userId}, voice ${voiceId}`);
      const audioBuffer = await generateSpeech(apiKey.encryptedKey, voiceId, text, {
        voice_settings: voiceSettings,
      });

      // Return audio as base64 for easy frontend handling
      const audioBase64 = audioBuffer.toString('base64');
      res.json({ 
        audio: audioBase64,
        format: 'mp3',
        size: audioBuffer.length 
      });
    } catch (error: any) {
      console.error("Error generating speech:", error);
      res.status(500).json({ message: error.message || "Failed to generate speech" });
    }
  });

  // ============================================================================
  // HEYGEN ROUTES
  // ============================================================================

  app.get("/api/heygen/avatars", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user's HeyGen API key
      const apiKey = await storage.getUserApiKey(userId, 'heygen');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No HeyGen API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[HeyGen] Fetching avatars for user ${userId}`);
      const avatars = await fetchHeyGenAvatars(apiKey.encryptedKey);
      
      res.json(avatars);
    } catch (error: any) {
      console.error("Error fetching HeyGen avatars:", error);
      res.status(500).json({ message: error.message || "Failed to fetch avatars" });
    }
  });

  app.post("/api/heygen/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { avatarId, script, voiceId, dimension } = req.body;

      if (!avatarId || !script) {
        return res.status(400).json({ message: "Avatar ID and script are required" });
      }

      // Get user's HeyGen API key
      const apiKey = await storage.getUserApiKey(userId, 'heygen');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No HeyGen API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[HeyGen] Generating video for user ${userId}, avatar ${avatarId}`);
      const videoId = await generateHeyGenVideo(apiKey.encryptedKey, {
        avatar_id: avatarId,
        script,
        voice_id: voiceId,
        dimension
      });

      res.json({ videoId });
    } catch (error: any) {
      console.error("Error generating HeyGen video:", error);
      res.status(500).json({ message: error.message || "Failed to generate video" });
    }
  });

  app.get("/api/heygen/status/:videoId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { videoId } = req.params;

      if (!videoId) {
        return res.status(400).json({ message: "Video ID is required" });
      }

      // Get user's HeyGen API key
      const apiKey = await storage.getUserApiKey(userId, 'heygen');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No HeyGen API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[HeyGen] Checking video status for ${videoId}`);
      const status = await getHeyGenVideoStatus(apiKey.encryptedKey, videoId);
      
      res.json(status);
    } catch (error: any) {
      console.error("Error checking HeyGen video status:", error);
      res.status(500).json({ message: error.message || "Failed to check video status" });
    }
  });

  // ============================================================================
  // PROJECT STEPS ROUTES
  // ============================================================================

  app.get("/api/projects/:id/steps", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const steps = await storage.getProjectSteps(id);
      res.json(steps);
    } catch (error) {
      console.error("Error fetching project steps:", error);
      res.status(500).json({ message: "Failed to fetch project steps" });
    }
  });

  app.post("/api/projects/:id/steps", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validated = insertProjectStepSchema.parse({
        ...req.body,
        projectId: id,
      });
      const step = await storage.createProjectStep(validated);
      res.json(step);
    } catch (error: any) {
      console.error("Error creating project step:", error);
      res.status(400).json({ message: error.message || "Failed to create project step" });
    }
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  async function parseRssSource(sourceId: string, url: string, userId: string) {
    try {
      console.log(`[RSS] Parsing source ${sourceId}: ${url}`);
      const feed = await rssParser.parseURL(url);
      
      let itemCount = 0;
      const createdItems: any[] = [];
      
      for (const item of feed.items.slice(0, 20)) { // Limit to 20 items
        try {
          const rssItem = await storage.createRssItem({
            sourceId,
            title: item.title || 'Untitled',
            url: item.link || url,
            content: item.contentSnippet || item.content || '',
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            aiScore: null,
            aiComment: null,
          });
          createdItems.push(rssItem);
          itemCount++;
        } catch (err) {
          console.error(`[RSS] Failed to save item:`, err);
        }
      }

      await storage.updateRssSource(sourceId, userId, {
        parseStatus: 'success',
        lastParsed: new Date(),
        itemCount,
        parseError: null,
      });

      console.log(`[RSS] Successfully parsed ${itemCount} items from ${sourceId}`);

      // Trigger AI scoring in background
      scoreRssItems(createdItems, userId).catch(err => 
        console.error('AI scoring failed:', err)
      );

    } catch (error: any) {
      console.error(`[RSS] Parsing failed for ${sourceId}:`, error);
      await storage.updateRssSource(sourceId, userId, {
        parseStatus: 'error',
        parseError: error.message || 'Failed to parse RSS feed',
      });
    }
  }

  async function scoreRssItems(items: any[], userId: string) {
    try {
      // Get user's Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        console.log('[AI] No Anthropic API key found for user, skipping scoring');
        return;
      }

      console.log(`[AI] Scoring ${items.length} RSS items...`);
      
      for (const item of items) {
        try {
          const result = await scoreNewsItem(
            apiKey.encryptedKey, // This is decrypted in getUserApiKey
            item.title,
            item.content
          );

          // Update the item with AI score
          await storage.updateRssItem(item.id, {
            aiScore: result.score,
            aiComment: result.comment,
          });

          console.log(`[AI] Scored item "${item.title}": ${result.score}/100`);
        } catch (err) {
          console.error(`[AI] Failed to score item "${item.title}":`, err);
        }
      }

      console.log(`[AI] Completed scoring ${items.length} items`);
    } catch (error) {
      console.error('[AI] Scoring failed:', error);
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
