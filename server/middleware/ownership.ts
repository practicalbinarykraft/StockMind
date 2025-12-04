/**
 * Ownership Verification Middleware
 * Provides reusable helpers to verify user owns a resource before allowing access
 *
 * SECURITY: Prevents users from accessing/modifying resources they don't own
 * Junior-Friendly: Single responsibility - only ownership checks
 */

import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { logger } from '../lib/logger';

/**
 * Verify user owns a project
 * Usage: app.get('/api/projects/:id', requireAuth, verifyProjectOwnership, handler)
 */
export async function verifyProjectOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    const projectId = req.params.id || req.params.projectId;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!projectId) {
      res.status(400).json({ message: 'Project ID required' });
      return;
    }

    // Check ownership via storage
    const project = await storage.getProject(projectId, userId);

    if (!project) {
      // Log for security audit trail
      logger.warn('Unauthorized project access attempt', {
        userId,
        projectId,
        ip: req.ip,
        path: req.path
      });

      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Attach project to request for use in handler
    (req as any).project = project;

    next();
  } catch (error: any) {
    logger.error('Error verifying project ownership', {
      error: error.message,
      userId: req.userId,
      projectId: req.params.id,
    });
    res.status(500).json({ message: 'Failed to verify ownership' });
  }
}

/**
 * Verify user owns an API key
 * Usage: app.delete('/api/settings/api-keys/:id', requireAuth, verifyApiKeyOwnership, handler)
 */
export async function verifyApiKeyOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    const keyId = req.params.id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!keyId) {
      res.status(400).json({ message: 'API key ID required' });
      return;
    }

    // Get API key
    const keys = await storage.getApiKeys(userId);
    const apiKey = keys.find(k => k.id === keyId);

    if (!apiKey) {
      logger.warn('Unauthorized API key access attempt', {
        userId,
        keyId,
        ip: req.ip,
        path: req.path
      });

      res.status(404).json({ message: 'API key not found' });
      return;
    }

    // Attach API key to request
    (req as any).apiKey = apiKey;

    next();
  } catch (error: any) {
    logger.error('Error verifying API key ownership', {
      error: error.message,
      userId: req.userId,
      keyId: req.params.id,
    });
    res.status(500).json({ message: 'Failed to verify ownership' });
  }
}

/**
 * Verify user owns a script version
 * First checks the version exists, then checks project ownership
 */
export async function verifyScriptVersionOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    const versionId = req.params.id || req.params.versionId;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!versionId) {
      res.status(400).json({ message: 'Version ID required' });
      return;
    }

    // Get script version
    const version = await storage.getScriptVersionById(versionId);

    if (!version) {
      res.status(404).json({ message: 'Script version not found' });
      return;
    }

    // Check project ownership
    const project = await storage.getProject(version.projectId, userId);

    if (!project) {
      logger.warn('Unauthorized script version access attempt', {
        userId,
        versionId,
        projectId: version.projectId,
        ip: req.ip,
        path: req.path
      });

      res.status(404).json({ message: 'Script version not found' });
      return;
    }

    // Attach version and project to request
    (req as any).scriptVersion = version;
    (req as any).project = project;

    next();
  } catch (error: any) {
    logger.error('Error verifying script version ownership', {
      error: error.message,
      userId: req.userId,
      versionId: req.params.id,
    });
    res.status(500).json({ message: 'Failed to verify ownership' });
  }
}

/**
 * Verify user owns Instagram source
 */
export async function verifyInstagramSourceOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    const sourceId = req.params.id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!sourceId) {
      res.status(400).json({ message: 'Source ID required' });
      return;
    }

    const source = await storage.getInstagramSource(sourceId, userId);

    if (!source) {
      logger.warn('Unauthorized Instagram source access attempt', {
        userId,
        sourceId,
        ip: req.ip
      });

      res.status(404).json({ message: 'Instagram source not found' });
      return;
    }

    (req as any).instagramSource = source;
    next();
  } catch (error: any) {
    logger.error('Error verifying Instagram source ownership', {
      error: error.message,
      userId: req.userId,
      sourceId: req.params.id,
    });
    res.status(500).json({ message: 'Failed to verify ownership' });
  }
}

/**
 * Verify user owns RSS source
 */
export async function verifyRssSourceOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    const sourceId = req.params.id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!sourceId) {
      res.status(400).json({ message: 'Source ID required' });
      return;
    }

    const source = await storage.getRssSource(sourceId, userId);

    if (!source) {
      logger.warn('Unauthorized RSS source access attempt', {
        userId,
        sourceId,
        ip: req.ip
      });

      res.status(404).json({ message: 'RSS source not found' });
      return;
    }

    (req as any).rssSource = source;
    next();
  } catch (error: any) {
    logger.error('Error verifying RSS source ownership', {
      error: error.message,
      userId: req.userId,
      sourceId: req.params.id,
    });
    res.status(500).json({ message: 'Failed to verify ownership' });
  }
}
