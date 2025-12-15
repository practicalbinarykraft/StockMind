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

  return {
    httpOnly: true,           // Cannot be accessed by JavaScript (XSS protection)
    secure: isProduction,     // Only HTTPS in production
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
  logger.debug('Setting auth cookie', {
    cookieName: COOKIE_NAME,
    options: { ...options, token: '[REDACTED]' },
  });
  res.cookie(COOKIE_NAME, token, options);
}

/**
 * Clear JWT cookie (logout)
 */
export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Get cookie name for middleware
 */
export function getAuthCookieName(): string {
  return COOKIE_NAME;
}
