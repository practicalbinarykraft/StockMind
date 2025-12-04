import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { db } from '../../server/db.js';
import { users } from '../../shared/schema/auth.js';
import { eq } from 'drizzle-orm';

// ⚠️ IMPORTANT: These tests require a separate test database
// Set TEST_DATABASE_URL environment variable before running:
//   TEST_DATABASE_URL=postgresql://user:pass@localhost:5433/test_db npm test
//
// Best practices for test environment:
// 1. Use a separate test database (TEST_DATABASE_URL)
// 2. Clear database before/after tests
// 3. Use transaction rollback for cleanup
// 4. Never run tests against production database

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';

describe('Authentication API Integration Tests', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  };

  let authToken: string;
  let userId: string;

  // Cleanup function to remove test user
  const cleanupTestUser = async () => {
    try {
      if (userId) {
        await db.delete(users).where(eq(users.id, userId));
      } else if (testUser.email) {
        await db.delete(users).where(eq(users.email, testUser.email));
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  afterAll(async () => {
    await cleanupTestUser();
  });

  describe('POST /api/auth/register', () => {
    test('should register new user successfully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Registration successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('firstName', testUser.firstName);
      expect(response.body.user).toHaveProperty('lastName', testUser.lastName);
      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Save for later tests
      authToken = response.body.token;
      userId = response.body.user.id;

      expect(typeof authToken).toBe('string');
      expect(authToken.split('.')).toHaveLength(3); // JWT format
    });

    test('should reject duplicate email registration', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/already exists|already registered/i);
    });

    test('should reject registration with invalid email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    test('should reject registration with short password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'short',
          firstName: 'New',
          lastName: 'User',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    test('should reject registration with missing fields', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@example.com',
          // missing password
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with correct credentials', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Verify token is valid JWT
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.split('.')).toHaveLength(3);
    });

    test('should reject login with wrong password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid|incorrect/i);
    });

    test('should reject login with non-existent email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    test('should reject login with missing fields', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          // missing password
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return user info with valid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', userId);
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('firstName', testUser.firstName);
      expect(response.body.user).toHaveProperty('lastName', testUser.lastName);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    test('should reject request without token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/authentication required|no token/i);
    });

    test('should reject request with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    test('should reject request with malformed authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Token Security', () => {
    test('should not accept tampered token', async () => {
      // Tamper with the token signature
      const tamperedToken = authToken.slice(0, -5) + 'XXXXX';

      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    test('should accept token in Authorization header without Bearer', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', authToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', userId);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty request body on login', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    test('should handle empty request body on registration', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    test('should trim whitespace from email on login', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: `  ${testUser.email}  `,
          password: testUser.password,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });
  });
});
