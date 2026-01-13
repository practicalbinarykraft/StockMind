/**
 * REFACTORED ROUTES - Junior-Friendly Code
 *
 * All routes are now modularized into separate files (<350 lines each).
 * This file serves as the main entry point that registers all route modules.
 *
 * Structure:
 * - server/routes/*.routes.ts - Route definitions by domain
 * - server/lib/*-background-tasks.ts - Background job handlers
 * - server/middleware/*.ts - Middleware configurations
 * - server/utils/*.ts - Shared utilities
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import igRouter from "./routes/ig";
import { ProjectService } from './services/project-service';
import { ScriptVersionService } from './services/script-version-service';
import { storage } from "./storage";

// Import all modular routes
import { registerAuthRoutes } from "./modules/auth/auth.routes";
import { registerUserRoutes } from "./modules/user/user.routes";
import { registerApiKeysRoutes } from "./routes/api-keys.routes";
import { registerRssRoutes } from "./routes/rss.routes";
import { registerInstagramSourcesRoutes } from "./routes/instagram-sources.routes";
import { registerInstagramItemsRoutes } from "./routes/instagram-items.routes";
import { registerNewsRoutes } from "./routes/news.routes";
import { registerNewsAnalysisRoutes } from "./routes/news-analysis.routes";
import { registerProjectsRoutes } from "./routes/projects.routes";
import { registerAiRoutes } from "./routes/ai.routes";
import { registerAudioRoutes } from "./routes/audio.routes";
import { registerElevenlabsRoutes } from "./routes/elevenlabs.routes";
import { registerHeygenRoutes } from "./routes/heygen.routes";
import { registerProjectStepsRoutes } from "./routes/project-steps.routes";
import { registerBrollRoutes } from "./routes/broll.routes";
import { registerAdvancedAnalysisRoutes } from "./routes/advanced-analysis.routes";
import { registerScriptVersionsRoutes } from "./routes/script-versions.routes";
import { registerScriptsLibraryRoutes } from "./routes/scripts-library.routes";
import { registerSceneEditingRoutes } from "./routes/scene-editing.routes";
import { registerReanalysisRoutes } from "./routes/reanalysis.routes";
import { registerVersionComparisonRoutes } from "./routes/version-comparison.routes";

// Conveyor (Content Factory) routes
import { registerConveyorSettingsRoutes } from "./routes/conveyor-settings.routes";
import { registerAutoScriptsRoutes } from "./routes/auto-scripts.routes";
import { registerConveyorStatusRoutes } from "./routes/conveyor-status.routes";
import { registerConveyorTriggerRoutes } from "./routes/conveyor-trigger.routes";
import { registerConveyorEventsRoutes } from "./routes/conveyor-events.routes";
import { registerConveyorProgressRoutes } from "./routes/conveyor-progress.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services (used by some routes)
  const projectService = new ProjectService(storage);
  const scriptVersionService = new ScriptVersionService(storage);

  // Register all route modules
  // Each module handles a specific domain or functionality

  // Core authentication
  registerAuthRoutes(app);

  // User routes
  registerUserRoutes(app);

  // Settings & Configuration
  registerApiKeysRoutes(app);
  registerRssRoutes(app);
  registerInstagramSourcesRoutes(app);

  // Content Management
  registerInstagramItemsRoutes(app);
  registerNewsRoutes(app);
  registerNewsAnalysisRoutes(app);

  // Projects
  registerProjectsRoutes(app);
  registerProjectStepsRoutes(app);

  // AI Services
  registerAiRoutes(app);
  registerAdvancedAnalysisRoutes(app);

  // Media Generation
  registerAudioRoutes(app);
  registerElevenlabsRoutes(app);
  registerHeygenRoutes(app);
  registerBrollRoutes(app);

  // Script Versioning & Editing
  registerScriptVersionsRoutes(app);
  registerScriptsLibraryRoutes(app);
  registerSceneEditingRoutes(app);
  registerReanalysisRoutes(app);
  registerVersionComparisonRoutes(app);

  // Instagram Analytics OAuth routes (already modularized)
  app.use('/api/ig', igRouter);

  // Conveyor (Content Factory)
  registerConveyorSettingsRoutes(app);
  registerAutoScriptsRoutes(app);
  registerConveyorStatusRoutes(app);
  registerConveyorTriggerRoutes(app);
  registerConveyorEventsRoutes(app);
  registerConveyorProgressRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
