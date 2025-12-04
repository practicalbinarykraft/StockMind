import type { Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { logger } from "../../lib/logger";
import { AnalyticsScraper, calculateEngagementRate } from "../../services/analytics-scraper";

/**
 * POST /api/projects/:id/analytics/refresh
 * Manually refresh analytics
 */
export async function refreshAnalytics(req: any, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return apiResponse.unauthorized(res);

    const { id: projectId } = req.params;

    // Verify project ownership
    const project = await storage.getProject(projectId, userId);
    if (!project) {
      return apiResponse.notFound(res, "Project not found");
    }

    const analytics = await storage.getAnalyticsByProject(projectId);
    if (!analytics) {
      return apiResponse.notFound(res, "Analytics not connected");
    }

    // Get Apify API key
    const apifyKey = await storage.getUserApiKey(userId, 'apify');
    if (!apifyKey) {
      return apiResponse.badRequest(res, "Apify API key not configured");
    }

    // Fetch stats
    const scraper = new AnalyticsScraper(apifyKey.decryptedKey);
    const stats = await scraper.fetchPostStats(
      analytics.platform as 'instagram' | 'tiktok' | 'youtube',
      analytics.postUrl
    );

    // Calculate engagement rate
    const engagementRate = calculateEngagementRate(stats);

    // Create snapshot
    await storage.createSnapshot({
      analyticsId: analytics.id,
      views: stats.views,
      likes: stats.likes,
      comments: stats.comments,
      shares: stats.shares,
      saves: stats.saves,
      reach: stats.reach,
      impressions: stats.impressions,
      plays: stats.plays,
      watchTimeSeconds: stats.watchTimeSeconds,
      engagementRate: engagementRate.toString(),
    });

    // Update analytics
    const nextFetchAt = new Date();
    nextFetchAt.setHours(nextFetchAt.getHours() + analytics.updateIntervalHours);

    await storage.updateAnalytics(analytics.id, {
      lastFetchedAt: new Date(),
      nextFetchAt,
      status: 'active',
      lastError: null,
    });

    return apiResponse.ok(res, { success: true, stats });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Error refreshing analytics", { error: errorMessage });
    
    // Update analytics with error
    const analytics = await storage.getAnalyticsByProject(req.params.id);
    if (analytics) {
      await storage.updateAnalytics(analytics.id, {
        status: 'error',
        lastError: errorMessage,
      });
    }

    return apiResponse.serverError(res, errorMessage);
  }
}

