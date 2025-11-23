/**
 * Instagram Sync and Binding Routes
 * Handles binding Instagram posts to script versions and performance tracking
 */

import { Router, type Request, type Response } from 'express';
import { storage } from '../../storage';
import { requireAuth } from "../../middleware/jwt-auth";
import { getUserId } from './oauth.routes';

const router = Router();

/**
 * POST /bind - Bind Instagram post to script version
 */
router.post('/bind', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { projectId, versionId, igMediaId, bindType = 'manual' } = req.body;

    // Validate required fields
    if (!projectId || !versionId || !igMediaId) {
      return res.status(400).json({
        message: 'Missing required fields',
        error: 'projectId, versionId, and igMediaId are required',
      });
    }

    // Verify project ownership
    const project = await storage.getProject(projectId, userId);
    if (!project) {
      return res.status(404).json({
        message: 'Project not found',
        error: 'Project does not exist or you do not have access to it',
      });
    }

    // Verify media ownership
    const media = await storage.getIgMediaById(igMediaId, userId);
    if (!media) {
      return res.status(404).json({
        message: 'Media not found',
        error: 'Media does not exist or you do not have access to it',
      });
    }

    // Create binding
    const binding = await storage.createProjectVersionBinding({
      projectId,
      versionId,
      igMediaId,
      bindType,
    });

    res.json({
      success: true,
      binding,
    });
  } catch (error) {
    console.error('[Instagram Binding] Error creating binding:', error);

    // Check for unique constraint violation (one post per version)
    if (error instanceof Error && error.message.includes('uniq_version_binding')) {
      return res.status(409).json({
        message: 'Binding already exists',
        error: 'This version is already bound to a post',
      });
    }

    res.status(500).json({
      message: 'Failed to create binding',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /bind/:bindingId - Delete binding
 */
router.delete('/bind/:bindingId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const bindingId = req.params.bindingId;
    await storage.deleteProjectVersionBinding(bindingId, userId);

    res.json({ success: true });
  } catch (error) {
    console.error('[Instagram Binding] Error deleting binding:', error);

    if (error instanceof Error && error.message.includes('not found or access denied')) {
      return res.status(404).json({
        message: 'Binding not found',
        error: 'Binding does not exist or you do not have access to it',
      });
    }

    res.status(500).json({
      message: 'Failed to delete binding',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /projects/:projectId/performance
 * Get predicted vs actual performance comparison
 */
router.get('/projects/:projectId/performance', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const projectId = req.params.projectId;

    // Verify project ownership
    const project = await storage.getProject(projectId, userId);
    if (!project) {
      return res.status(404).json({
        message: 'Project not found',
        error: 'Project does not exist or you do not have access to it',
      });
    }

    // Get all versions for this project
    const versions = await storage.getScriptVersions(projectId);

    // Get bindings for this project
    const bindings = await storage.getProjectVersionBindings(projectId);

    // Build performance data
    const performanceData = await Promise.all(
      versions.map(async (version) => {
        const binding = bindings.find(b => b.versionId === version.id);
        let actualMetrics = null;
        let latestInsight = null;
        if (binding) {
          const insights = await storage.getIgMediaInsights(binding.igMediaId, 1);
          if (insights.length > 0) {
            latestInsight = insights[0];
            actualMetrics = insights[0].metrics;
          }
        }

        const predictedMetrics = version.metrics ? (version.metrics as any).predicted || null : null;
        let deltas: Record<string, any> | null = null;

        if (predictedMetrics && actualMetrics) {
          deltas = {};
          for (const key of Object.keys(predictedMetrics)) {
            const predictedValue = (predictedMetrics as Record<string, any>)[key];
            const actualValue = (actualMetrics as Record<string, any>)[key];
            if (typeof predictedValue === 'number' && typeof actualValue === 'number') {
              deltas[key] = {
                predicted: predictedValue,
                actual: actualValue,
                delta: actualValue - predictedValue,
                deltaPercent: predictedValue > 0 ? ((actualValue - predictedValue) / predictedValue) * 100 : 0,
              };
            }
          }
        }

        return {
          versionId: version.id,
          versionNumber: version.versionNumber,
          isCurrent: version.isCurrent,
          createdAt: version.createdAt,
          predictedMetrics,
          actualMetrics,
          deltas,
          binding: binding || null,
          latestInsightCollectedAt: latestInsight?.collectedAt || null,
        };
      })
    );

    res.json({
      projectId,
      versions: performanceData,
    });
  } catch (error) {
    console.error('[Instagram Performance] Error fetching performance data:', error);
    res.status(500).json({
      message: 'Failed to fetch performance data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
