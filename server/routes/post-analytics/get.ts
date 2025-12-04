import type { Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { logger } from "../../lib/logger";

/**
 * GET /api/projects/:id/analytics
 * Get analytics for a project
 */
export async function getAnalytics(req: any, res: Response) {
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
      return apiResponse.ok(res, { connected: false });
    }

    // Get latest snapshot
    const latestSnapshot = await storage.getLatestSnapshot(analytics.id);
    
    // Get previous snapshot (24h ago) for comparison
    const snapshots = await storage.getSnapshots(analytics.id, 2);
    const previousSnapshot = snapshots.length > 1 ? snapshots[1] : null;

    // Calculate 24h changes
    const changes24h = latestSnapshot && previousSnapshot ? {
      views: (latestSnapshot.views || 0) - (previousSnapshot.views || 0),
      likes: (latestSnapshot.likes || 0) - (previousSnapshot.likes || 0),
      comments: (latestSnapshot.comments || 0) - (previousSnapshot.comments || 0),
      shares: (latestSnapshot.shares || 0) - (previousSnapshot.shares || 0),
      saves: (latestSnapshot.saves || 0) - (previousSnapshot.saves || 0),
    } : null;

    const currentStats = latestSnapshot ? {
      views: latestSnapshot.views || 0,
      likes: latestSnapshot.likes || 0,
      comments: latestSnapshot.comments || 0,
      shares: latestSnapshot.shares || 0,
      saves: latestSnapshot.saves || 0,
      engagementRate: latestSnapshot.engagementRate ? parseFloat(latestSnapshot.engagementRate.toString()) : 0,
    } : null;

    return apiResponse.ok(res, {
      connected: true,
      platform: analytics.platform,
      postUrl: analytics.postUrl,
      currentStats,
      changes24h,
      lastFetchedAt: analytics.lastFetchedAt,
      nextFetchAt: analytics.nextFetchAt,
      status: analytics.status,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Error fetching analytics", { error: errorMessage });
    return apiResponse.serverError(res, errorMessage);
  }
}

