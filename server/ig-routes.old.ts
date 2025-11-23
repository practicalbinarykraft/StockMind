/**
 * Instagram Analytics OAuth Routes
 * Handles Facebook OAuth flow for Instagram Business/Creator accounts
 */

import { Router, type Request, type Response } from 'express';
import { storage } from './storage';
import { isAuthenticated } from './replit-auth';
import * as igGraphClient from './ig-graph-client';
import * as encryption from './encryption';

const router = Router();

// ============================================================================
// Environment Variables
// ============================================================================

const FB_APP_ID = process.env.FB_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const BASE_URL = process.env.REPL_SLUG 
  ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
  : 'http://localhost:5000';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get userId from request (supports both req.user.id and req.user.claims.sub)
 */
function getUserId(req: Request): string | null {
  const user = req.user as any;
  return user?.id || user?.claims?.sub || null;
}

/**
 * Validate required environment variables
 */
function validateEnvVars(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!FB_APP_ID) missing.push('FB_APP_ID');
  if (!FB_APP_SECRET) missing.push('FB_APP_SECRET');
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/ig/auth/url
 * Generates Facebook Login URL with Instagram scopes
 * 
 * Scopes:
 * - instagram_basic: Access Instagram account info
 * - pages_show_list: List Facebook Pages
 * - pages_read_engagement: Read Page engagement data
 * - instagram_manage_insights: Access Instagram Insights
 */
router.get('/auth/url', isAuthenticated, (req: Request, res: Response) => {
  try {
    // Check environment variables
    const { valid, missing } = validateEnvVars();
    if (!valid) {
      return res.status(500).json({
        message: 'Server configuration error',
        error: `Missing required environment variables: ${missing.join(', ')}`,
        action: 'Please configure FB_APP_ID and FB_APP_SECRET in Secrets',
      });
    }

    // Build OAuth URL
    const redirectUri = `${BASE_URL}/api/ig/auth/callback`;
    const scope = [
      'instagram_basic',
      'pages_show_list',
      'pages_read_engagement',
      'instagram_manage_insights',
    ].join(',');

    const authUrl = new URL('https://www.facebook.com/v22.0/dialog/oauth');
    authUrl.searchParams.set('client_id', FB_APP_ID!);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', 'instagram_oauth'); // CSRF protection

    res.json({
      authUrl: authUrl.toString(),
      redirectUri,
      scopes: scope.split(','),
    });
  } catch (error) {
    console.error('[Instagram OAuth] Error generating auth URL:', error);
    res.status(500).json({
      message: 'Failed to generate authorization URL',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/ig/auth/callback
 * Handles OAuth callback from Facebook
 * 
 * Steps:
 * 1. Exchange code for short-lived token
 * 2. Exchange for long-lived token (60 days)
 * 3. Get Facebook user ID
 * 4. Get user's Facebook Pages
 * 5. Find page with Instagram Business Account
 * 6. Get Instagram account details
 * 7. Encrypt and save token to database
 * 8. Return success with Instagram account info
 */
router.get('/auth/callback', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // 1. Validate authorization code
    const code = req.query.code as string;
    const error = req.query.error as string;
    const errorDescription = req.query.error_description as string;

    if (error) {
      console.error('[Instagram OAuth] Authorization error:', error, errorDescription);
      return res.status(400).json({
        message: 'Authorization failed',
        error: error,
        description: errorDescription || 'User denied authorization or an error occurred',
      });
    }

    if (!code) {
      return res.status(400).json({
        message: 'Missing authorization code',
        error: 'No code parameter provided in callback',
      });
    }

    // Check environment variables
    const { valid, missing } = validateEnvVars();
    if (!valid) {
      return res.status(500).json({
        message: 'Server configuration error',
        error: `Missing required environment variables: ${missing.join(', ')}`,
      });
    }

    // Get authenticated user ID
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized',
        error: 'You must be logged in to connect an Instagram account',
      });
    }

    console.log(`[Instagram OAuth] Processing callback for userId: ${userId}`);

    // 2. Exchange code for short-lived token
    const redirectUri = `${BASE_URL}/api/ig/auth/callback`;
    console.log('[Instagram OAuth] Exchanging code for short-lived token...');
    const shortLivedTokenResponse = await igGraphClient.exchangeCodeForToken(
      code,
      redirectUri,
      FB_APP_ID!,
      FB_APP_SECRET!
    );

    // 3. Exchange for long-lived token (60 days)
    console.log('[Instagram OAuth] Exchanging for long-lived token...');
    const longLivedTokenResponse = await igGraphClient.getLongLivedToken(
      shortLivedTokenResponse.access_token,
      FB_APP_ID!,
      FB_APP_SECRET!
    );

    const accessToken = longLivedTokenResponse.access_token;
    const expiresIn = longLivedTokenResponse.expires_in; // seconds (typically 5184000 = 60 days)

    // 4. Get Facebook user ID
    console.log('[Instagram OAuth] Fetching Facebook user ID...');
    const fbUserId = await igGraphClient.getFacebookUserId(accessToken);

    // 5. Get user's Facebook Pages
    console.log('[Instagram OAuth] Fetching Facebook Pages...');
    const pages = await igGraphClient.getUserPages(accessToken);

    if (pages.length === 0) {
      return res.status(403).json({
        message: 'No Facebook Pages found',
        error: 'You must have a Facebook Page connected to your Instagram Business account',
        help: 'Please create a Facebook Page and connect it to your Instagram Business account',
      });
    }

    // 6. Find page with Instagram Business Account
    console.log(`[Instagram OAuth] Found ${pages.length} pages, searching for Instagram Business account...`);
    const pageWithInstagram = pages.find(page => page.instagram_business_account?.id);

    if (!pageWithInstagram) {
      return res.status(403).json({
        message: 'No Instagram Business account found',
        error: 'None of your Facebook Pages are connected to an Instagram Business account',
        help: 'Please convert your Instagram account to a Business account and connect it to a Facebook Page',
        pages: pages.map(p => ({ id: p.id, name: p.name, hasInstagram: false })),
      });
    }

    const igUserId = pageWithInstagram.instagram_business_account!.id;
    const fbPageId = pageWithInstagram.id;
    const pageAccessToken = pageWithInstagram.access_token;

    console.log(`[Instagram OAuth] Found Instagram Business account: ${igUserId} on page: ${pageWithInstagram.name}`);

    // 7. Get Instagram account details
    console.log('[Instagram OAuth] Fetching Instagram account details...');
    const igAccount = await igGraphClient.getInstagramAccount(igUserId, pageAccessToken);

    // 8. Encrypt long-lived token
    console.log('[Instagram OAuth] Encrypting access token...');
    const encryptedToken = encryption.encrypt(accessToken);

    // 9. Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // 10. Save to database
    console.log('[Instagram OAuth] Saving Instagram account to database...');
    const savedAccount = await storage.createIgAccount(userId, {
      fbUserId,
      fbPageId,
      igUserId,
      igUsername: igAccount.username,
      accessTokenEncrypted: encryptedToken,
      tokenExpiresAt,
      accountStatus: 'active',
      lastError: null,
    });

    console.log(`[Instagram OAuth] Successfully connected Instagram account: @${igAccount.username}`);

    // 11. Return success
    res.json({
      success: true,
      igUserId: savedAccount.igUserId,
      igUsername: savedAccount.igUsername,
      accountId: savedAccount.id,
      expiresAt: tokenExpiresAt.toISOString(),
      message: `Successfully connected Instagram account @${igAccount.username}`,
    });

  } catch (error) {
    console.error('[Instagram OAuth] Callback error:', error);

    // Handle Graph API errors
    if (error instanceof igGraphClient.GraphAPIClientError) {
      return res.status(error.statusCode >= 500 ? 500 : 400).json({
        message: 'Facebook API error',
        error: error.message,
        errorType: error.errorType,
        errorCode: error.errorCode,
        fbTraceId: error.fbTraceId,
      });
    }

    // Handle encryption errors
    if (error instanceof Error && error.message.includes('Encryption failed')) {
      return res.status(500).json({
        message: 'Token encryption error',
        error: error.message,
        help: 'Please ensure SESSION_SECRET is configured correctly',
      });
    }

    // Generic error
    res.status(500).json({
      message: 'Failed to complete Instagram OAuth flow',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Account Management Routes
// ============================================================================

/**
 * GET /api/ig/accounts
 * List connected Instagram accounts
 */
router.get('/accounts', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const accounts = await storage.getIgAccounts(userId);

    // Add tokenStatus and remove encrypted token
    const accountsWithStatus = accounts.map(account => {
      const { accessTokenEncrypted, ...accountData } = account;
      
      // Calculate token status
      const now = new Date();
      const expiresAt = new Date(account.tokenExpiresAt);
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let tokenStatus: 'valid' | 'expiring_soon' | 'expired';
      if (daysUntilExpiry < 0) {
        tokenStatus = 'expired';
      } else if (daysUntilExpiry <= 7) {
        tokenStatus = 'expiring_soon';
      } else {
        tokenStatus = 'valid';
      }

      return {
        ...accountData,
        tokenStatus,
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
      };
    });

    res.json(accountsWithStatus);
  } catch (error) {
    console.error('[Instagram Accounts] Error fetching accounts:', error);
    res.status(500).json({
      message: 'Failed to fetch Instagram accounts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/ig/accounts/:id
 * Disconnect Instagram account
 */
router.delete('/accounts/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const accountId = req.params.id;
    
    // Check if account exists and belongs to user
    const account = await storage.getIgAccountById(accountId, userId);
    if (!account) {
      return res.status(404).json({
        message: 'Instagram account not found',
        error: 'Account does not exist or you do not have access to it',
      });
    }

    await storage.deleteIgAccount(accountId, userId);

    res.json({ success: true });
  } catch (error) {
    console.error('[Instagram Accounts] Error deleting account:', error);
    res.status(500).json({
      message: 'Failed to delete Instagram account',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Media Routes
// ============================================================================

/**
 * GET /api/ig/:accountId/media
 * List Instagram media (Reels) with pagination
 */
router.get('/:accountId/media', isAuthenticated, async (req: Request, res: Response) => {
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
    console.error('[Instagram Media] Error fetching media:', error);

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
 * GET /api/ig/media/:igMediaId/insights
 * Get insights history for a specific media post
 */
router.get('/media/:igMediaId/insights', isAuthenticated, async (req: Request, res: Response) => {
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
 * POST /api/ig/media/:igMediaId/sync
 * Force sync insights for a specific media post
 */
router.post('/media/:igMediaId/sync', isAuthenticated, async (req: Request, res: Response) => {
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

// ============================================================================
// Binding Routes
// ============================================================================

/**
 * POST /api/ig/bind
 * Bind Instagram post to script version
 */
router.post('/bind', isAuthenticated, async (req: Request, res: Response) => {
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
 * DELETE /api/ig/bind/:bindingId
 * Delete binding
 */
router.delete('/bind/:bindingId', isAuthenticated, async (req: Request, res: Response) => {
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
 * GET /api/projects/:projectId/performance
 * Get predicted vs actual performance comparison
 */
router.get('/projects/:projectId/performance', isAuthenticated, async (req: Request, res: Response) => {
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
          // Get latest insights for bound media
          const insights = await storage.getIgMediaInsights(binding.igMediaId, 1);
          if (insights.length > 0) {
            latestInsight = insights[0];
            actualMetrics = insights[0].metrics;
          }
        }

        // Extract predicted metrics from version.metrics
        const predictedMetrics = version.metrics ? (version.metrics as any).predicted || null : null;

        // Calculate deltas if both predicted and actual exist
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
