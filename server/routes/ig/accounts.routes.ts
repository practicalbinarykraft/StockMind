/**
 * Instagram Account Management Routes
 * Handles listing, connecting, and disconnecting Instagram accounts
 */

import { Router, type Request, type Response } from 'express';
import { storage } from '../../storage';
import { requireAuth } from "../../middleware/jwt-auth";
import { getUserId, validateEnvVars, BASE_URL } from './oauth.routes';

const router = Router();

// ============================================================================
// Account Management Routes
// ============================================================================

/**
 * GET /accounts
 * List connected Instagram accounts
 *
 * Returns all Instagram accounts connected by the authenticated user
 * with token status information (valid, expiring_soon, expired)
 */
router.get('/accounts', requireAuth, async (req: Request, res: Response) => {
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
 * POST /accounts/connect
 * Generate OAuth URL to connect a new Instagram account
 *
 * Scopes:
 * - instagram_basic: Access Instagram account info
 * - pages_show_list: List Facebook Pages
 * - pages_read_engagement: Read Page engagement data
 * - instagram_manage_insights: Access Instagram Insights
 *
 * Returns the OAuth URL for the user to authorize the app
 */
router.post('/accounts/connect', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

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

    const FB_APP_ID = process.env.FB_APP_ID;
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
    console.error('[Instagram Accounts] Error generating auth URL:', error);
    res.status(500).json({
      message: 'Failed to generate authorization URL',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /accounts/:id
 * Disconnect Instagram account
 *
 * Removes the Instagram account and all associated data
 * from the authenticated user's account
 */
router.delete('/accounts/:id', requireAuth, async (req: Request, res: Response) => {
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

export default router;
