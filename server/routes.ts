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

// Import all modular routes
import { registerAuthRoutes } from "./modules/auth/auth.routes";
import { registerUserRoutes } from "./modules/user/user.routes";
import { registerApiKeysRoutes } from "./modules/api-keys/api-keys.routes";
import { registerRssRoutes } from "./modules/rss-sources/rss-sources.routes";
import { registerInstagramSourcesRoutes } from "./modules/instagram-sources/instagram-sources.routes";
import { registerInstagramItemsRoutes } from "./modules/instagram-items/instagram-items.routes";
import { registerNewsRoutes } from "./modules/news/news.routes";
import { registerNewsAnalysisRoutes } from "./modules/news-analysis/news-analysis.routes";
import { registerProjectsRoutes } from "./routes/projects.routes";
import { registerAiRoutes } from "./modules/ai/ai.routes";
import { registerAudioRoutes } from "./modules/audio/audio.routes";
import { registerElevenlabsRoutes } from "./modules/elevenlabs/elevenlabs.routes";
import { registerHeygenRoutes } from "./modules/heygen/heygen.routes";
import { registerProjectStepsRoutes } from "./modules/project-steps/project-steps.routes";
import { registerBrollRoutes } from "./modules/broll/broll.routes";
import { registerAdvancedAnalysisRoutes } from "./modules/advanced-analysis/advanced-analysis.routes";
import { registerScriptVersionsRoutes } from "./modules/script-versions/script-versions.routes";
import { registerScriptsLibraryRoutes } from "./modules/scripts-library/scripts-library.routes";
import { registerSceneEditingRoutes } from "./modules/scene-editing/scene-editing.routes";
import { registerReanalysisRoutes } from "./modules/reanalysis/reanalysis.routes";
import { registerVersionComparisonRoutes } from "./modules/version-comparison/version-comparison.routes";

// Conveyor (Content Factory) routes - Modularized
import { registerConveyorSettingsRoutes } from "./modules/conveyor-settings/conveyor-settings.routes";
import { registerAutoScriptsRoutes } from "./modules/auto-scripts/auto-scripts.routes";
import { registerConveyorStatusRoutes } from "./modules/conveyor-status/conveyor-status.routes";
import { registerConveyorTriggerRoutes } from "./modules/conveyor-trigger/conveyor-trigger.routes";
import { registerConveyorEventsRoutes } from "./modules/conveyor-events/conveyor-events.routes";
import { registerConveyorProgressRoutes } from "./modules/conveyor-progress/conveyor-progress.routes";
import { registerAiSettingsRoutes } from "./modules/ai-settings/ai-settings.routes";

export async function registerRoutes(app: Express): Promise<Server> {
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
  registerAiSettingsRoutes(app);

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
