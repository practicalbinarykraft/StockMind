/**
 * Cookie Authentication Helpers
 *
 * Secure JWT token storage using httpOnly cookies
 * Junior-Friendly: Simple, single-responsibility module
 */

import type { Response } from 'express';

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
  // Only require secure cookies if HTTPS is enabled
  const useHttps = process.env.USE_HTTPS === 'true';

  return {
    httpOnly: true,           // Cannot be accessed by JavaScript (XSS protection)
    secure: useHttps,         // Only require HTTPS if explicitly enabled
    sameSite: 'lax',          // CSRF protection
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
}

/**
 * Set JWT token in httpOnly cookie
 */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
}

/**
 * Clear JWT cookie (logout)
 */
export function clearAuthCookie(res: Response): void {
  const useHttps = process.env.USE_HTTPS === 'true';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: useHttps,
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
