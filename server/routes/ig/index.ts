/**
 * Instagram Routes Index
 * Combines all Instagram-related route modules
 */

import { Router } from 'express';
import oauthRoutes from './oauth.routes';
import accountsRoutes from './accounts.routes';
import mediaRoutes from './media.routes';
import insightsRoutes from './insights.routes';
import syncRoutes from './sync.routes';

const router = Router();

// ============================================================================
// Mount Route Modules
// ============================================================================

// OAuth routes - /api/ig/auth/*
router.use('/', oauthRoutes);

// Account management routes - /api/ig/accounts/*
router.use('/', accountsRoutes);

// Media routes - /api/ig/:accountId/media, /api/ig/media/:igMediaId/*
router.use('/', mediaRoutes);

// Insights routes - /api/ig/media/:igMediaId/insights, /api/ig/media/:igMediaId/sync
router.use('/', insightsRoutes);

// Sync and binding routes - /api/ig/bind/*, /api/ig/projects/:projectId/performance
router.use('/', syncRoutes);

// ============================================================================
// Export
// ============================================================================

export default router;
