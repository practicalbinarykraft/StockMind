/**
 * Instagram OAuth Routes
 * Handles Facebook OAuth flow for Instagram Business/Creator accounts
 */

import { Router, type Request, type Response } from 'express';
import { storage } from '../../storage';
import { requireAuth } from '../../middleware/jwt-auth';
import * as igGraphClient from '../../ig-graph-client';
import * as encryption from '../../encryption';

const router = Router();

// Environment Variables
const FB_APP_ID = process.env.FB_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Helper Functions

/**
 * Get userId from request (JWT auth attaches userId directly)
 */
function getUserId(req: Request): string | null {
  return (req as any).userId || null;
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

/**
 * GET /auth/callback
 * Handles OAuth callback from Facebook
 */
router.get('/auth/callback', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate authorization code
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

    // Exchange code for tokens
    const redirectUri = `${BASE_URL}/api/ig/auth/callback`;
    const shortLivedTokenResponse = await igGraphClient.exchangeCodeForToken(
      code,
      redirectUri,
      FB_APP_ID!,
      FB_APP_SECRET!
    );

    const longLivedTokenResponse = await igGraphClient.getLongLivedToken(
      shortLivedTokenResponse.access_token,
      FB_APP_ID!,
      FB_APP_SECRET!
    );

    const accessToken = longLivedTokenResponse.access_token;
    const expiresIn = longLivedTokenResponse.expires_in;

    // Get Facebook user and pages
    const fbUserId = await igGraphClient.getFacebookUserId(accessToken);
    const pages = await igGraphClient.getUserPages(accessToken);

    if (pages.length === 0) {
      return res.status(403).json({
        message: 'No Facebook Pages found',
        error: 'You must have a Facebook Page connected to your Instagram Business account',
        help: 'Please create a Facebook Page and connect it to your Instagram Business account',
      });
    }

    // Find page with Instagram Business Account
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

    // Get Instagram account details and save to database
    const igAccount = await igGraphClient.getInstagramAccount(igUserId, pageAccessToken);
    const encryptedToken = encryption.encrypt(accessToken);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

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

export default router;
export { getUserId, validateEnvVars, FB_APP_ID, FB_APP_SECRET, BASE_URL };
