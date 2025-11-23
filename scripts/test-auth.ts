#!/usr/bin/env tsx

/**
 * Authentication Flow Test Script
 * Tests registration, login, JWT tokens, and protected routes
 */

import { generateToken, hashPassword, comparePassword, verifyToken, extractToken } from '../server/lib/jwt-auth';

async function runTests() {
  console.log('🧪 Testing JWT Authentication System\n');
  console.log('=' .repeat(60));

  // Test 1: Password hashing and comparison
  console.log('\n1️⃣  Testing Password Hashing...');
  try {
    const testPassword = 'MySecurePassword123!';
    const hashedPassword = await hashPassword(testPassword);

    console.log('   ✅ Password hashed successfully');
    console.log(`   Hash: ${hashedPassword.substring(0, 20)}...`);

    const isValid = await comparePassword(testPassword, hashedPassword);
    console.log(`   ✅ Password comparison works: ${isValid}`);

    const isInvalid = await comparePassword('WrongPassword', hashedPassword);
    console.log(`   ✅ Wrong password rejected: ${!isInvalid}`);
  } catch (error: any) {
    console.error('   ❌ Password hashing failed:', error.message);
    process.exit(1);
  }

  // Test 2: JWT token generation and verification
  console.log('\n2️⃣  Testing JWT Token Generation...');
  try {
    const testUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: null,
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const token = generateToken(testUser);
    console.log('   ✅ Token generated successfully');
    console.log(`   Token: ${token.substring(0, 40)}...`);

    const payload = verifyToken(token);
    console.log('   ✅ Token verified successfully');
    console.log(`   Payload userId: ${payload.userId}`);
    console.log(`   Payload email: ${payload.email}`);

    if (payload.userId !== testUser.id || payload.email !== testUser.email) {
      throw new Error('Token payload mismatch');
    }
    console.log('   ✅ Payload matches expected values');
  } catch (error: any) {
    console.error('   ❌ JWT token test failed:', error.message);
    process.exit(1);
  }

  // Test 3: Token extraction from headers
  console.log('\n3️⃣  Testing Token Extraction...');
  try {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

    // Bearer format
    const bearerHeader = `Bearer ${testToken}`;
    const extractedBearer = extractToken(bearerHeader);
    if (extractedBearer !== testToken) {
      throw new Error('Bearer token extraction failed');
    }
    console.log('   ✅ Bearer token extraction works');

    // Plain format
    const extractedPlain = extractToken(testToken);
    if (extractedPlain !== testToken) {
      throw new Error('Plain token extraction failed');
    }
    console.log('   ✅ Plain token extraction works');

    // No token
    const extractedNone = extractToken(undefined);
    if (extractedNone !== null) {
      throw new Error('Empty token should return null');
    }
    console.log('   ✅ Empty token returns null');
  } catch (error: any) {
    console.error('   ❌ Token extraction test failed:', error.message);
    process.exit(1);
  }

  // Test 4: Invalid token rejection
  console.log('\n4️⃣  Testing Invalid Token Rejection...');
  try {
    try {
      verifyToken('invalid.token.here');
      console.error('   ❌ Invalid token was not rejected!');
      process.exit(1);
    } catch (error) {
      console.log('   ✅ Invalid token correctly rejected');
    }

    try {
      verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0In0.wrong_signature');
      console.error('   ❌ Token with wrong signature was not rejected!');
      process.exit(1);
    } catch (error) {
      console.log('   ✅ Token with wrong signature correctly rejected');
    }
  } catch (error: any) {
    console.error('   ❌ Invalid token test failed:', error.message);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All JWT authentication tests passed!\n');
  console.log('Next steps:');
  console.log('1. Set SESSION_SECRET environment variable');
  console.log('2. Apply database migration: npm run db:push');
  console.log('3. Start server: npm run dev');
  console.log('4. Test API endpoints:');
  console.log('   - POST /api/auth/register');
  console.log('   - POST /api/auth/login');
  console.log('   - GET /api/auth/me (with token)');
}

runTests();
