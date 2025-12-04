import type { Express } from "express";
import { requireAuth } from "../../middleware/jwt-auth";
import { connectAnalytics } from "./connect";
import { getAnalytics } from "./get";
import { refreshAnalytics } from "./refresh";
import { getHistory } from "./history";
import { disconnectAnalytics } from "./disconnect";
import { updateAnalytics } from "./update";

/**
 * Post Analytics routes
 * Handles analytics connection, fetching, and management
 */
export function registerPostAnalyticsRoutes(app: Express) {
  app.post("/api/projects/:id/analytics/connect", requireAuth, connectAnalytics);
  app.get("/api/projects/:id/analytics", requireAuth, getAnalytics);
  app.get("/api/projects/:id/analytics/history", requireAuth, getHistory);
  app.post("/api/projects/:id/analytics/refresh", requireAuth, refreshAnalytics);
  app.delete("/api/projects/:id/analytics", requireAuth, disconnectAnalytics);
  app.patch("/api/projects/:id/analytics", requireAuth, updateAnalytics);
}

