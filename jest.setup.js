// Jest setup file for global test configuration

// Set test environment variables
process.env.NODE_ENV = 'test';

// Use test-specific secrets (minimum 32 characters for JWT_SECRET)
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-min-32-chars-long-12345';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-min-32-chars-long-12345';

// CRITICAL: Use separate test database to avoid affecting production data
// Set TEST_DATABASE_URL environment variable before running tests
// Example: TEST_DATABASE_URL=postgresql://user:pass@localhost:5433/test_db npm test
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

// Warn if using production database in tests
if (process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
  console.warn('⚠️  WARNING: Using DATABASE_URL for tests. Set TEST_DATABASE_URL to use a separate test database.');
  if (process.env.DATABASE_URL.includes('localhost') === false) {
    console.error('❌ ERROR: Production database detected! Set TEST_DATABASE_URL environment variable.');
    process.exit(1);
  }
}
