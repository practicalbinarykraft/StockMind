/**
 * REFACTORED ROUTES - Junior-Friendly Code Version
 *
 * This file demonstrates the modular architecture approach.
 * All route definitions are split into separate files (<200 lines each).
 *
 * Structure:
 * - server/routes/*.routes.ts - Route definitions by domain
 * - server/lib/*-background-tasks.ts - Background job handlers
 * - server/middleware/*.ts - Middleware configurations
 * - server/utils/*.ts - Shared utilities
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./replit-auth";
import igRouter from "./ig-routes";
import { ProjectService } from './services/project-service';
import { ScriptVersionService } from './services/script-version-service';
import { storage } from "./storage";

// Import modular routes
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerApiKeysRoutes } from "./routes/api-keys.routes";
import { registerRssRoutes } from "./routes/rss.routes";

// TODO: Import remaining route modules (to be created):
// import { registerInstagramSourcesRoutes } from "./routes/instagram-sources.routes";
// import { registerInstagramItemsRoutes } from "./routes/instagram-items.routes";
// import { registerNewsRoutes } from "./routes/news.routes";
// import { registerProjectsRoutes } from "./routes/projects.routes";
// import { registerAiRoutes } from "./routes/ai.routes";
// import { registerAudioRoutes } from "./routes/audio.routes";
// import { registerElevenLabsRoutes } from "./routes/elevenlabs.routes";
// import { registerHeyGenRoutes } from "./routes/heygen.routes";
// import { registerProjectStepsRoutes } from "./routes/project-steps.routes";
// import { registerBRollRoutes } from "./routes/broll.routes";
// import { registerAdvancedAnalysisRoutes } from "./routes/advanced-analysis.routes";
// import { registerScriptVersionsRoutes } from "./routes/script-versions.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // Initialize services
  const projectService = new ProjectService(storage);
  const scriptVersionService = new ScriptVersionService(storage);

  // Register all route modules
  registerAuthRoutes(app);
  registerApiKeysRoutes(app);
  registerRssRoutes(app);

  // TODO: Register remaining routes (following same pattern):
  // registerInstagramSourcesRoutes(app);
  // registerInstagramItemsRoutes(app);
  // registerNewsRoutes(app);
  // registerProjectsRoutes(app, projectService);
  // registerAiRoutes(app);
  // registerAudioRoutes(app);
  // registerElevenLabsRoutes(app);
  // registerHeyGenRoutes(app);
  // registerProjectStepsRoutes(app);
  // registerBRollRoutes(app);
  // registerAdvancedAnalysisRoutes(app, scriptVersionService);
  // registerScriptVersionsRoutes(app, scriptVersionService);

  // Instagram Analytics OAuth routes (already modularized)
  app.use('/api/ig', igRouter);

  const httpServer = createServer(app);
  return httpServer;
}
