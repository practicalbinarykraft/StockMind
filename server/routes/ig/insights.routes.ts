/**
 * Instagram Insights Routes
 * Handles fetching and syncing insights/metrics from Instagram Graph API
 */

import { Router, type Request, type Response } from 'express';
import { storage } from '../../storage';
import { requireAuth } from "../../middleware/jwt-auth";
import * as igGraphClient from '../../ig-graph-client';
import * as encryption from '../../encryption';
import { getUserId } from './oauth.routes';

const router = Router();

// ============================================================================
// Insights Routes
// ============================================================================

/**
 * GET /media/:igMediaId/insights
 * Get insights history for a specific media post
 *
 * Returns all historical insights data for the media,
 * including the latest metrics and collection timestamps
 */
router.get('/media/:igMediaId/insights', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const igMediaId = req.params.igMediaId;

    // Get media and verify ownership
    const media = await storage.getIgMediaById(igMediaId, userId);
    if (!media) {
      return res.status(404).json({
        message: 'Media not found',
        error: 'Media does not exist or you do not have access to it',
      });
    }

    // Get insights history
    const insights = await storage.getIgMediaInsights(igMediaId);

    // Extract latest metrics
    const latestMetrics = insights.length > 0 ? insights[0].metrics : null;

    res.json({
      insights,
      latestMetrics,
      mediaInfo: {
        id: media.id,
        igMediaId: media.igMediaId,
        permalink: media.permalink,
        caption: media.caption,
        publishedAt: media.publishedAt,
      },
    });
  } catch (error) {
    console.error('[Instagram Insights] Error fetching insights:', error);
    res.status(500).json({
      message: 'Failed to fetch insights',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /media/:igMediaId/sync
 * Force sync insights for a specific media post
 *
 * Fetches the latest insights from Instagram Graph API
 * and saves them to the database. Updates sync status
 * and schedules next sync for 24 hours later.
 */
router.post('/media/:igMediaId/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const igMediaId = req.params.igMediaId;

    // Get media and verify ownership
    const media = await storage.getIgMediaById(igMediaId, userId);
    if (!media) {
      return res.status(404).json({
        message: 'Media not found',
        error: 'Media does not exist or you do not have access to it',
      });
    }

    // Get account and decrypt token
    const account = await storage.getIgAccountById(media.igAccountId, userId);
    if (!account) {
      return res.status(404).json({
        message: 'Instagram account not found',
      });
    }

    // Check token expiration
    if (new Date(account.tokenExpiresAt) < new Date()) {
      return res.status(403).json({
        message: 'Instagram token expired',
        error: 'Please reconnect your Instagram account',
      });
    }

    const accessToken = encryption.decrypt(account.accessTokenEncrypted);

    // Update sync status to syncing
    console.log(`[Instagram Insights] Syncing insights for media: ${media.igMediaId}`);
    await storage.updateIgMediaSync(igMediaId, 'syncing');

    try {
      // Fetch insights from Instagram Graph API
      const insightsResponse = await igGraphClient.getMediaInsights(media.igMediaId, accessToken);

      // Parse metrics into a clean object
      const metrics: Record<string, number> = {};
      for (const insight of insightsResponse.data) {
        const value = insight.values[0]?.value;
        if (typeof value === 'number') {
          metrics[insight.name] = value;
        } else if (typeof value === 'object' && value !== null) {
          // Handle nested objects (e.g., total_interactions)
          Object.assign(metrics, value);
        }
      }

      console.log(`[Instagram Insights] Collected metrics:`, Object.keys(metrics));

      // Save insights to database
      await storage.createIgMediaInsight({
        igMediaId,
        metrics,
        raw: insightsResponse,
        collectedAt: new Date(),
      });

      // Update sync status and schedule next sync (24 hours from now)
      const nextSyncAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.updateIgMediaSync(igMediaId, 'ok', null, nextSyncAt);

      res.json({
        success: true,
        metrics,
        nextSyncAt,
      });
    } catch (syncError) {
      // Update sync status to error
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';
      await storage.updateIgMediaSync(igMediaId, 'error', errorMessage);

      throw syncError;
    }
  } catch (error) {
    console.error('[Instagram Sync] Error syncing media:', error);

    if (error instanceof igGraphClient.GraphAPIClientError) {
      const statusCode = error.statusCode === 429 ? 429 : error.statusCode >= 500 ? 500 : 400;
      return res.status(statusCode).json({
        message: 'Instagram API error',
        error: error.message,
        errorType: error.errorType,
        errorCode: error.errorCode,
      });
    }

    res.status(500).json({
      message: 'Failed to sync media insights',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
