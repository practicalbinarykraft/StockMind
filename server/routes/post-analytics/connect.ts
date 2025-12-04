import type { Express, Request, Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { logger } from "../../lib/logger";
import { AnalyticsScraper } from "../../services/analytics-scraper";

/**
 * POST /api/projects/:id/analytics/connect
 * Connect analytics to a project
 */
export async function connectAnalytics(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return apiResponse.unauthorized(res);

    const { id: projectId } = req.params;
    const { platform, postUrl, updateIntervalHours = 6, trackingDays = 30 } = req.body;

    if (!platform || !postUrl) {
      return apiResponse.badRequest(res, "Platform and postUrl are required");
    }

    // Validate platform
    if (!['instagram', 'tiktok', 'youtube'].includes(platform)) {
      return apiResponse.badRequest(res, "Invalid platform. Supported: instagram, tiktok, youtube");
    }

    // Verify project ownership
    const project = await storage.getProject(projectId, userId);
    if (!project) {
      return apiResponse.notFound(res, "Project not found");
    }

    // Check if analytics already exists
    const existing = await storage.getAnalyticsByProject(projectId);
    if (existing) {
      return apiResponse.badRequest(res, "Analytics already connected to this project");
    }

    // Get Apify API key
    const apifyKey = await storage.getUserApiKey(userId, 'apify');
    if (!apifyKey) {
      return apiResponse.badRequest(res, "Apify API key not configured. Please add it in Settings.");
    }

    // Test fetch to validate URL
    try {
      const scraper = new AnalyticsScraper(apifyKey.decryptedKey);
      await scraper.fetchPostStats(platform as 'instagram' | 'tiktok' | 'youtube', postUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("[Analytics] Failed to fetch post stats:", { error: errorMessage });
      return apiResponse.badRequest(res, `Failed to fetch post: ${errorMessage}`);
    }

    // Create analytics record
    const analytics = await storage.createAnalytics(userId, {
      projectId,
      platform,
      postUrl,
      updateIntervalHours,
      trackingDays,
      status: 'active',
    });

    // Schedule first fetch
    await storage.createFetchTask(analytics.id, new Date());

    return apiResponse.ok(res, analytics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Error connecting analytics", { error: errorMessage });
    return apiResponse.serverError(res, errorMessage);
  }
}

