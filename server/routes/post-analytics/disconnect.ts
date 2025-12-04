import type { Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { logger } from "../../lib/logger";

/**
 * DELETE /api/projects/:id/analytics
 * Disconnect analytics
 */
export async function disconnectAnalytics(req: any, res: Response) {
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

    await storage.deleteAnalytics(analytics.id);

    return apiResponse.ok(res, { message: "Analytics disconnected" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Error disconnecting analytics", { error: errorMessage });
    return apiResponse.serverError(res, errorMessage);
  }
}

