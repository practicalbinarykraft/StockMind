import type { Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { logger } from "../../lib/logger";

/**
 * PATCH /api/projects/:id/analytics
 * Update analytics settings
 */
export async function updateAnalytics(req: any, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return apiResponse.unauthorized(res);

    const { id: projectId } = req.params;
    const { updateIntervalHours, isActive } = req.body;

    // Verify project ownership
    const project = await storage.getProject(projectId, userId);
    if (!project) {
      return apiResponse.notFound(res, "Project not found");
    }

    const analytics = await storage.getAnalyticsByProject(projectId);
    if (!analytics) {
      return apiResponse.notFound(res, "Analytics not connected");
    }

    const updateData: Partial<typeof analytics> = {};
    if (updateIntervalHours !== undefined) {
      updateData.updateIntervalHours = updateIntervalHours;
      // Recalculate nextFetchAt
      const nextFetchAt = new Date();
      nextFetchAt.setHours(nextFetchAt.getHours() + updateIntervalHours);
      updateData.nextFetchAt = nextFetchAt;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
      updateData.status = isActive ? 'active' : 'paused';
    }

    const updated = await storage.updateAnalytics(analytics.id, updateData);

    return apiResponse.ok(res, updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Error updating analytics", { error: errorMessage });
    return apiResponse.serverError(res, errorMessage);
  }
}

