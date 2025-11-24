import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { User } from '@shared/schema';

/**
 * JWT Authentication Library
 * Provides token generation, validation, and password hashing
 */

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || '';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days
const BCRYPT_ROUNDS = 10;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
}

export interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Generate JWT token for a user
 */
export function generateToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a plain password with a hashed password
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Extract JWT token from Authorization header
 * Supports both "Bearer <token>" and plain token formats
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Support "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Support plain token format
  return authHeader;
}
