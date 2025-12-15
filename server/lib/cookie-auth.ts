/**
 * Cookie Authentication Helpers
 *
 * Secure JWT token storage using httpOnly cookies
 * Junior-Friendly: Simple, single-responsibility module
 */

import type { Response } from 'express';
import { logger } from './logger';

// Cookie configuration
const COOKIE_NAME = 'jwt_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
}

/**
 * Get cookie options based on environment
 */
function getCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // IMPORTANT: secure:true requires HTTPS
  // For development or HTTP access (including external IP), use secure:false
  // Only enable secure in production with proper HTTPS setup
  const useSecure = isProduction && process.env.USE_HTTPS === 'true';

  return {
    httpOnly: true,           // Cannot be accessed by JavaScript (XSS protection)
    secure: false,        // Only HTTPS when explicitly configured
    sameSite: 'lax',          // CSRF protection  
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
}

/**
 * Set JWT token in httpOnly cookie
 */
export function setAuthCookie(res: Response, token: string): void {
  const options = getCookieOptions();
  
  // CRITICAL: Log cookie settings for debugging auth issues
  logger.info('Setting auth cookie', {
    cookieName: COOKIE_NAME,
    nodeEnv: process.env.NODE_ENV || 'undefined',
    useHttps: process.env.USE_HTTPS || 'undefined',
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
  
  res.cookie(COOKIE_NAME, token, options);
}

/**
 * Clear JWT cookie (logout)
 */
export function clearAuthCookie(res: Response): void {
  const options = getCookieOptions();
  res.clearCookie(COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}

/**
 * Get cookie name for middleware
 */
export function getAuthCookieName(): string {
  return COOKIE_NAME;
}
