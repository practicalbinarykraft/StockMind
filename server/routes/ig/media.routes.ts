/**
 * Instagram Media Routes
 * Handles fetching media (posts, reels, etc.) from Instagram Graph API
 */

import { Router, type Request, type Response } from 'express';
import { storage } from '../../storage';
import { requireAuth } from "../../middleware/jwt-auth";
import * as igGraphClient from '../../ig-graph-client';
import * as encryption from '../../encryption';
import { getUserId } from '../../utils/route-helpers';
import { logger } from '../../lib/logger';

const router = Router();

// ============================================================================
// Media Routes
// ============================================================================

/**
 * GET /:accountId/media
 * List Instagram media (Reels) with pagination
 *
 * Query parameters:
 * - limit: Number of media items to return (default: 30)
 * - after: Pagination cursor for next page
 * - since: Unix timestamp to filter media published after this date
 * - until: Unix timestamp to filter media published before this date
 * - mediaType: Filter by media type (REEL, VIDEO, IMAGE, CAROUSEL_ALBUM)
 *
 * Fetches media from Instagram Graph API and saves to database
 */
router.get('/:accountId/media', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const accountId = req.params.accountId;
    const { limit = '30', after, since, until, mediaType = 'REEL' } = req.query;

    // Get and verify account ownership
    const account = await storage.getIgAccountById(accountId, userId);
    if (!account) {
      return res.status(404).json({
        message: 'Instagram account not found',
        error: 'Account does not exist or you do not have access to it',
      });
    }

    // Check token expiration
    if (new Date(account.tokenExpiresAt) < new Date()) {
      return res.status(403).json({
        message: 'Instagram token expired',
        error: 'Please reconnect your Instagram account',
      });
    }

    // Decrypt access token
    const accessToken = encryption.decrypt(account.accessTokenEncrypted);

    // Fetch media from Instagram Graph API
    logger.info(`[Instagram Media] Fetching media for account: ${account.igUsername}`);
    const mediaResponse = await igGraphClient.getInstagramMedia(
      account.igUserId,
      accessToken,
      {
        limit: parseInt(limit as string, 10),
        after: after as string,
        since: since as string,
        until: until as string,
        mediaType: mediaType as 'REEL' | 'VIDEO' | 'IMAGE' | 'CAROUSEL_ALBUM' | undefined,
      }
    );

    // Upsert media to database
    logger.info(`[Instagram Media] Saving ${mediaResponse.data.length} media items to database`);
    for (const media of mediaResponse.data) {
      await storage.upsertIgMedia({
        igAccountId: accountId,
        igMediaId: media.id,
        permalink: media.permalink,
        mediaType: media.media_type as any,
        caption: media.caption,
        thumbnailUrl: media.thumbnail_url,
        publishedAt: new Date(media.timestamp),
        syncStatus: 'idle',
      });
    }

    res.json({
      data: mediaResponse.data,
      paging: mediaResponse.paging,
    });
  } catch (error) {
    logger.error('[Instagram Media] Error fetching media:', { error });

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
      message: 'Failed to fetch media',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /media/:igMediaId/details
 * Get details for a specific media post
 *
 * Returns media information from the database including
 * permalink, caption, thumbnail, and sync status
 */
router.get('/media/:igMediaId/details', requireAuth, async (req: Request, res: Response) => {
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

    res.json({
      id: media.id,
      igMediaId: media.igMediaId,
      permalink: media.permalink,
      mediaType: media.mediaType,
      caption: media.caption,
      thumbnailUrl: media.thumbnailUrl,
      publishedAt: media.publishedAt,
      syncStatus: media.syncStatus,
      lastSyncedAt: media.lastSyncedAt,
      nextSyncAt: media.nextSyncAt,
      syncError: media.syncError,
    });
  } catch (error) {
    logger.error('[Instagram Media] Error fetching media details:', { error });
    res.status(500).json({
      message: 'Failed to fetch media details',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
