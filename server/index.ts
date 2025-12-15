// CRITICAL: Load environment variables from .env file FIRST (before any other imports)
import "./env-loader";

// CRITICAL: Validate environment variables BEFORE any other imports
import { validateEnvironmentOrExit } from "./lib/env-validator";
validateEnvironmentOrExit();

import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initInstagramMonitor } from "./cron/instagram-monitor";
import { initIgAnalyticsSync } from "./cron/ig-analytics-sync";
import { initAnalyticsUpdater } from "./cron/analytics-updater";
import { storage } from "./storage";

// Production hardening imports
import { setupSentry, sentryErrorHandler } from "./lib/sentry";
import { setupSecurity } from "./middleware/security";
import { apiLimiter, aiLimiter, authLimiter } from "./middleware/rate-limiter";
import { logger, requestLogger } from "./lib/logger";
import { setupGracefulShutdown } from "./lib/graceful-shutdown";
import { registerHealthRoutes } from "./routes/health.routes";

const app = express();

// 1. Sentry must be first (if configured)
setupSentry(app);

// 2. Security headers (CORS, helmet, etc.)
setupSecurity(app);

// 3. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 4. Cookie parsing (for JWT in httpOnly cookies)
app.use(cookieParser());

// 5. Request logging (Winston)
app.use(requestLogger);

(async () => {
  // 5. Health checks (before routes, no rate limiting)
  registerHealthRoutes(app);

  // 6. Rate limiting for API routes
  app.use('/api/ai/', aiLimiter);
  app.use('/api/auth/', authLimiter);
  app.use('/api/', apiLimiter);

  // 7. Main application routes
  const server = await registerRoutes(app);

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Initialize Instagram monitoring cron job (Apify scraping)
  initInstagramMonitor(storage);
  logger.info('Instagram monitoring cron job initialized');

  // Initialize Instagram Analytics sync cron job (Graph API insights)
  initIgAnalyticsSync(storage);
  logger.info('Instagram Analytics sync cron job initialized');

  // Initialize RSS monitoring cron job (automatic RSS parsing)
  const { initRssMonitor } = await import('./cron/rss-monitor');
  initRssMonitor(storage);
  logger.info('RSS monitoring cron job initialized');

  // Initialize analytics updater cron job
  initAnalyticsUpdater();

  // Initialize Content Factory (Conveyor) cron job
  const { initConveyorRunner } = await import('./cron/conveyor-runner');
  initConveyorRunner();
  logger.info('Content Factory (Conveyor) cron job initialized');

  // 8. Sentry error handler (must be before other error handlers)
  app.use(sentryErrorHandler());

  // 9. Final error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error('Error handler caught exception', {
      error: message,
      status,
      stack: err.stack
    });

    res.status(status).json({ message });
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  // Use 0.0.0.0 to allow connections from both localhost and 127.0.0.1
  // This ensures cookies work correctly regardless of how user accesses the app
  const host = "0.0.0.0";
  server.listen(port, host, () => {
    logger.info(`🚀 Server running on port ${port}`, {
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    });
  });

  // 10. Setup graceful shutdown handlers
  setupGracefulShutdown(server);
})();
