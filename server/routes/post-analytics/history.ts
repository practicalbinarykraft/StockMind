import type { Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { logger } from "../../lib/logger";

/**
 * GET /api/projects/:id/analytics/history
 * Get analytics history for charts
 */
export async function getHistory(req: any, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return apiResponse.unauthorized(res);

    const { id: projectId } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    // Verify project ownership
    const project = await storage.getProject(projectId, userId);
    if (!project) {
      return apiResponse.notFound(res, "Project not found");
    }

    const analytics = await storage.getAnalyticsByProject(projectId);
    if (!analytics) {
      return apiResponse.ok(res, { snapshots: [] });
    }

    const snapshots = await storage.getSnapshots(analytics.id, days);

    return apiResponse.ok(res, {
      snapshots: snapshots.map(s => ({
        date: s.fetchedAt,
        views: s.views || 0,
        likes: s.likes || 0,
        comments: s.comments || 0,
        shares: s.shares || 0,
        saves: s.saves || 0,
        engagementRate: s.engagementRate ? parseFloat(s.engagementRate.toString()) : 0,
      }))
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Error fetching analytics history", { error: errorMessage });
    return apiResponse.serverError(res, errorMessage);
  }
}

