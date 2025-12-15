import type { Request, Response, NextFunction } from 'express';
import { verifyToken, extractToken } from '../lib/jwt-auth';
import { getAuthCookieName } from '../lib/cookie-auth';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger';

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 */

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Middleware to verify JWT token and authenticate user
 * Replaces Replit Auth isAuthenticated middleware
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // First try to get token from httpOnly cookie (more secure)
    // Fall back to Authorization header (for API clients)
    const cookieName = getAuthCookieName();
    const cookieToken = req.cookies?.[cookieName];
    const headerToken = extractToken(req.headers.authorization);
    const token = cookieToken || headerToken;

    // Debug logging for authentication issues
    logger.debug('Auth middleware check', {
      path: req.path,
      hasCookieParser: !!req.cookies,
      cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
      expectedCookieName: cookieName,
      hasCookieToken: !!cookieToken,
      hasHeaderToken: !!headerToken,
      cookieHeader: req.headers.cookie,
    });

    if (!token) {
      logger.warn('No auth token found', {
        path: req.path,
        cookies: req.cookies,
        cookieHeader: req.headers.cookie,
      });
      res.status(401).json({
        message: 'Authentication required'
      });
      return;
    }

    // Verify token
    const payload = verifyToken(token);

    // Verify user still exists in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({
        message: 'User not found'
      });
      return;
    }

    // Attach user info to request
    req.userId = user.id;
    req.userEmail = user.email;

    next();
  } catch (error: any) {
    logger.warn('Authentication failed', {
      error: error.message,
      path: req.path
    });

    res.status(401).json({
      message: 'Authentication failed'
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token
 * Useful for endpoints that work with or without auth
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // First try cookie, then header
    const cookieToken = req.cookies?.[getAuthCookieName()];
    const headerToken = extractToken(req.headers.authorization);
    const token = cookieToken || headerToken;

    if (token) {
      const payload = verifyToken(token);
      req.userId = payload.userId;
      req.userEmail = payload.email;
    }
  } catch (error) {
    // Silently fail - optional auth
    logger.debug('Optional auth failed', { error });
  }

  next();
}
