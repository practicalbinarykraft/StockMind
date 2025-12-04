import { describe, test, expect } from '@jest/globals';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  extractToken,
} from '../../server/lib/jwt-auth.js';
import type { User } from '../../shared/schema/auth.js';

describe('JWT Authentication Library', () => {
  describe('Password Hashing', () => {
    test('should hash password successfully', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
      expect(hash).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash format
    });

    test('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    test('should reject wrong password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await hashPassword(password);
      const isValid = await comparePassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    test('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // bcrypt uses random salt
      expect(await comparePassword(password, hash1)).toBe(true);
      expect(await comparePassword(password, hash2)).toBe(true);
    });
  });

  describe('JWT Token Generation', () => {
    const testUser: User = {
      id: 'test-user-123',
      email: 'test@example.com',
      passwordHash: null,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    test('should generate valid JWT token', () => {
      const token = generateToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should include correct payload in token', () => {
      const token = generateToken(testUser);
      const payload = verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(testUser.id);
      expect(payload.email).toBe(testUser.email);
    });
  });

  describe('JWT Token Verification', () => {
    const testUser: User = {
      id: 'test-user-123',
      email: 'test@example.com',
      passwordHash: null,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    test('should verify valid token', () => {
      const token = generateToken(testUser);
      const payload = verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(testUser.id);
      expect(payload.email).toBe(testUser.email);
    });

    test('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyToken(invalidToken)).toThrow();
    });

    test('should reject token with wrong signature', () => {
      const token = generateToken(testUser);
      // Tamper with signature
      const tamperedToken = token.slice(0, -5) + 'XXXXX';

      expect(() => verifyToken(tamperedToken)).toThrow();
    });

    test('should reject malformed token', () => {
      const malformedTokens = [
        '',
        'not-a-token',
        'header.payload', // missing signature
        'too.many.parts.in.token',
      ];

      malformedTokens.forEach(token => {
        expect(() => verifyToken(token)).toThrow();
      });
    });
  });

  describe('Token Extraction', () => {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.test';

    test('should extract token from Bearer header', () => {
      const bearerHeader = `Bearer ${testToken}`;
      const extracted = extractToken(bearerHeader);

      expect(extracted).toBe(testToken);
    });

    test('should extract token from plain format', () => {
      const extracted = extractToken(testToken);

      expect(extracted).toBe(testToken);
    });

    test('should return null for empty string', () => {
      const extracted = extractToken('');

      expect(extracted).toBeNull();
    });

    test('should return null for undefined', () => {
      const extracted = extractToken(undefined);

      expect(extracted).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty email', () => {
      const user: User = {
        id: 'test-123',
        email: '',
        passwordHash: null,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const token = generateToken(user);
      const payload = verifyToken(token);

      expect(payload.userId).toBe(user.id);
      expect(payload.email).toBe('');
    });

    test('should handle long user ID', () => {
      const user: User = {
        id: 'a'.repeat(255),
        email: 'test@example.com',
        passwordHash: null,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const token = generateToken(user);
      const payload = verifyToken(token);

      expect(payload.userId).toBe(user.id);
    });

    test('should handle special characters in email', () => {
      const user: User = {
        id: 'test-123',
        email: 'test+filter@example.co.uk',
        passwordHash: null,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const token = generateToken(user);
      const payload = verifyToken(token);

      expect(payload.email).toBe(user.email);
    });
  });
});
