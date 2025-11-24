# StockMind Production Readiness Implementation Plan
**Created:** 2025-11-24
**Status:** In Progress
**Estimated Total Time:** 2-3 weeks (1 developer)

---

## 📊 Executive Summary

**Current State:** 5.4/10 - Not production ready
**Target State:** 9.0/10 - Production ready
**Estimated Effort:** 80-120 hours

**Phase Breakdown:**
- Phase 1 (CRITICAL): 5 days - Foundation & Security
- Phase 2 (HIGH): 5 days - Quality & Performance
- Phase 3 (MEDIUM): 3 days - Polish & Optimization
- Phase 4 (FINAL): 2 days - Testing & Deployment

---

## 🎯 Overall Strategy

### Success Criteria
- [ ] All CRITICAL issues resolved
- [ ] All HIGH issues resolved
- [ ] 70%+ test coverage
- [ ] 90%+ Winston logger coverage
- [ ] Database migrations working
- [ ] Staging environment operational
- [ ] Production deployment successful

---

# PHASE 1: CRITICAL FIXES (5 days)
**Goal:** Fix blockers that prevent production deployment

---

## Task 1.1: Implement Database Migrations System
**Priority:** 🔴 CRITICAL
**Estimated Time:** 8 hours (1 day)
**Dependencies:** None
**Assigned To:** Backend Developer

### Why This Matters
Currently using `drizzle-kit push` which directly modifies database schema without migration history. This is **dangerous** in production:
- Can't rollback changes
- No audit trail
- Risk of data loss
- Can't test migrations before applying

### Steps

#### Step 1: Setup Drizzle Migrations (30 min)
```bash
# 1. Create migrations directory
mkdir -p drizzle/migrations

# 2. Update drizzle.config.ts
```

**File:** `drizzle.config.ts`
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './shared/schema/**/*.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

#### Step 2: Generate Initial Migration (1 hour)
```bash
# Generate migration from current schema
npm run db:generate

# This creates: drizzle/migrations/0000_initial_schema.sql
# Review the generated SQL carefully!
```

**Expected Output:**
```
drizzle/migrations/
├── 0000_initial_schema.sql
└── meta/
    ├── _journal.json
    └── 0000_snapshot.json
```

#### Step 3: Update package.json Scripts (15 min)
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "echo 'DEPRECATED: Use db:migrate instead' && exit 1",
    "db:studio": "drizzle-kit studio"
  }
}
```

#### Step 4: Create Migration Runner (1 hour)
**File:** `server/db/migrate.ts`
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { logger } from '../lib/logger';

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  logger.info('Starting database migrations...');

  try {
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    logger.info('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
```

#### Step 5: Test on Development Database (2 hours)
```bash
# 1. Backup current dev database
docker-compose exec postgres pg_dump -U stockmind stockmind > backup_dev.sql

# 2. Drop and recreate database
docker-compose exec postgres psql -U stockmind -c "DROP DATABASE stockmind"
docker-compose exec postgres psql -U stockmind -c "CREATE DATABASE stockmind"

# 3. Run migrations
npm run db:migrate

# 4. Verify schema
docker-compose exec postgres psql -U stockmind stockmind -c "\dt"

# 5. Start app and test
npm run dev
```

#### Step 6: Create Rollback Script (1 hour)
**File:** `scripts/rollback-migration.sh`
```bash
#!/bin/bash
# Rollback last migration

set -e

MIGRATION_NUMBER=${1:-1}

echo "⚠️  Rolling back $MIGRATION_NUMBER migration(s)"
echo "Press Ctrl+C to cancel, Enter to continue..."
read

# Backup before rollback
BACKUP_FILE="backup_before_rollback_$(date +%Y%m%d_%H%M%S).sql"
docker-compose exec postgres pg_dump -U stockmind stockmind > "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# Get list of applied migrations
MIGRATIONS=$(docker-compose exec postgres psql -U stockmind stockmind -t -c \
  "SELECT name FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT $MIGRATION_NUMBER")

echo "Migrations to rollback:"
echo "$MIGRATIONS"

# TODO: Implement actual rollback logic
# Drizzle doesn't have built-in rollback, so we need to:
# 1. Manually write DOWN migrations
# 2. Or restore from backup

echo "❌ Rollback not implemented yet - restore from backup: $BACKUP_FILE"
exit 1
```

#### Step 7: Update Dockerfile (30 min)
```dockerfile
# In Dockerfile, add migration step
COPY drizzle ./drizzle

# Update CMD to run migrations before starting
CMD ["sh", "-c", "node server/db/migrate.js && node dist/index.js"]
```

#### Step 8: Documentation (1 hour)
**File:** `docs/DATABASE_MIGRATIONS.md`
```markdown
# Database Migrations Guide

## Creating a New Migration

1. Modify schema files in `shared/schema/`
2. Generate migration: `npm run db:generate`
3. Review generated SQL in `drizzle/migrations/`
4. Test locally
5. Commit migration files

## Applying Migrations

Development:
```bash
npm run db:migrate
```

Production:
```bash
docker-compose exec app node server/db/migrate.js
```

## Rollback (Manual)

1. Restore from backup
2. Re-apply migrations up to desired point
```

### Acceptance Criteria
- [ ] `npm run db:generate` creates migration files
- [ ] `npm run db:migrate` applies migrations successfully
- [ ] Migrations work on clean database
- [ ] Migrations are idempotent (can run multiple times)
- [ ] Dockerfile runs migrations on startup
- [ ] Documentation complete

### Testing Checklist
```bash
# Test 1: Fresh database
docker-compose down -v
docker-compose up -d postgres
npm run db:migrate
npm run dev  # Should work

# Test 2: Existing database
npm run db:migrate  # Should be no-op

# Test 3: New migration
# Edit schema, add column
npm run db:generate
npm run db:migrate
# Verify column exists

# Test 4: Production simulation
docker-compose up --build
# App should start successfully
```

---

## Task 1.2: Fix Remaining Security Issues
**Priority:** 🔴 CRITICAL
**Estimated Time:** 4 hours
**Dependencies:** None

### Step 1: Replace console.error in Security-Critical Files (2 hours)

**Files to fix:**
1. `server/routes/api-keys.routes.ts` (3 console.error)
2. `server/middleware/security.ts` (1 console.error)
3. `server/lib/api-key-tester.ts` (check if exists)

**Find all instances:**
```bash
grep -rn "console\." server/routes/api-keys.routes.ts
grep -rn "console\." server/middleware/security.ts
```

**Replace pattern:**
```typescript
// BEFORE:
console.error("Error testing API key:", error);

// AFTER:
import { logger } from '../lib/logger';

logger.error('Error testing API key', {
  error: error.message,
  // DON'T log: API key, full error (may contain key)
  provider: apiKey.provider,
  userId: userId
});
```

**Critical: Sanitize API provider errors:**
```typescript
// BEFORE:
res.status(500).json({
  success: false,
  message: error.message  // ⚠️ May leak API key details
});

// AFTER:
import { sanitizeAIError } from '../lib/error-sanitizer';

res.status(500).json({
  success: false,
  message: 'API key validation failed',  // Generic message
  details: sanitizeAIError(error)  // Sanitized details
});
```

**Create Error Sanitizer:**
**File:** `server/lib/error-sanitizer.ts`
```typescript
/**
 * Sanitizes errors from AI providers to prevent leaking sensitive info
 */
export function sanitizeAIError(error: any): string {
  const message = error.message || String(error);

  // Remove API keys (various formats)
  let sanitized = message
    .replace(/sk-[a-zA-Z0-9]{48}/g, 'sk-***')  // OpenAI
    .replace(/sk-ant-[a-zA-Z0-9-]{95}/g, 'sk-ant-***')  // Anthropic
    .replace(/Bearer\s+[a-zA-Z0-9_-]+/g, 'Bearer ***')
    .replace(/api[_-]?key["\s:=]+[a-zA-Z0-9_-]+/gi, 'api_key=***');

  // Provide user-friendly message
  if (sanitized.includes('401') || sanitized.includes('Unauthorized')) {
    return 'Invalid API key';
  }
  if (sanitized.includes('429') || sanitized.includes('rate limit')) {
    return 'API rate limit exceeded';
  }
  if (sanitized.includes('quota')) {
    return 'API quota exceeded';
  }

  return 'API request failed';
}
```

### Step 2: Add Production Environment Validation (1 hour)

**File:** `server/lib/validate-env.ts`
```typescript
import { logger } from './logger';

interface RequiredEnvVars {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  JWT_SECRET: string;
  ALLOWED_ORIGINS?: string;  // Required only in production
  NODE_ENV: string;
}

export function validateEnvironment() {
  const env = process.env;
  const errors: string[] = [];

  // Required in all environments
  if (!env.DATABASE_URL) errors.push('DATABASE_URL is required');
  if (!env.SESSION_SECRET) errors.push('SESSION_SECRET is required');
  if (!env.JWT_SECRET) errors.push('JWT_SECRET is required');

  // Validate secret strength
  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters');
  }
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  // Production-specific requirements
  if (env.NODE_ENV === 'production') {
    if (!env.ALLOWED_ORIGINS) {
      errors.push('ALLOWED_ORIGINS is required in production');
    }

    if (env.ALLOWED_ORIGINS === '*') {
      errors.push('ALLOWED_ORIGINS cannot be "*" in production');
    }

    // Warn about test/dev secrets
    if (env.SESSION_SECRET?.includes('test') ||
        env.SESSION_SECRET?.includes('dev')) {
      errors.push('SESSION_SECRET appears to be a test value');
    }
  }

  if (errors.length > 0) {
    logger.error('Environment validation failed:', { errors });
    console.error('\n❌ ENVIRONMENT VALIDATION FAILED:\n');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\nFix these issues before starting the application.\n');
    process.exit(1);
  }

  logger.info('Environment validation passed');
}
```

**Call in server/index.ts:**
```typescript
import { validateEnvironment } from './lib/validate-env';

// At the very top, before anything else
validateEnvironment();
```

### Step 3: Add .env Validation to Docker (30 min)

**File:** `docker-entrypoint.sh`
```bash
#!/bin/sh
set -e

echo "🔍 Validating environment..."

# Check required variables
REQUIRED_VARS="DATABASE_URL SESSION_SECRET JWT_SECRET"

for var in $REQUIRED_VARS; do
  eval value=\$$var
  if [ -z "$value" ]; then
    echo "❌ ERROR: $var is not set"
    exit 1
  fi
done

# Check ALLOWED_ORIGINS in production
if [ "$NODE_ENV" = "production" ] && [ -z "$ALLOWED_ORIGINS" ]; then
  echo "❌ ERROR: ALLOWED_ORIGINS required in production"
  exit 1
fi

echo "✅ Environment validation passed"

# Run migrations
echo "🔄 Running database migrations..."
node server/db/migrate.js

# Start application
echo "🚀 Starting application..."
exec node dist/index.js
```

**Update Dockerfile:**
```dockerfile
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["dumb-init", "--"]
CMD ["docker-entrypoint.sh"]
```

### Acceptance Criteria
- [ ] No console.error in api-keys.routes.ts
- [ ] Error sanitizer prevents API key leakage
- [ ] Environment validation runs on startup
- [ ] App fails fast with clear error messages
- [ ] Docker entrypoint validates environment

---

## Task 1.3: Setup Automated Database Backups
**Priority:** 🔴 CRITICAL
**Estimated Time:** 4 hours
**Dependencies:** Task 1.1 (migrations)

### Step 1: Create Backup Script (1 hour)

**File:** `scripts/backup-database.sh`
```bash
#!/bin/bash
# Automated database backup script

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/stockmind_$TIMESTAMP.sql"
LATEST_LINK="$BACKUP_DIR/latest.sql"

echo "📦 Starting database backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform backup
if [ -n "$DATABASE_URL" ]; then
  # Direct connection
  pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
else
  # Docker compose
  docker-compose exec -T postgres pg_dump -U stockmind stockmind > "$BACKUP_FILE"
fi

# Compress
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

# Create/update 'latest' symlink
ln -sf "$(basename $BACKUP_FILE)" "$LATEST_LINK.gz"

# Get backup size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "✅ Backup completed: $BACKUP_FILE ($SIZE)"

# Clean old backups
echo "🧹 Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "stockmind_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List remaining backups
echo "📋 Current backups:"
ls -lh "$BACKUP_DIR"/stockmind_*.sql.gz

echo "✅ Backup process complete"
```

### Step 2: Create Restore Script (1 hour)

**File:** `scripts/restore-database.sh`
```bash
#!/bin/bash
# Database restore script

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh backups/stockmind_*.sql.gz
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "⚠️  WARNING: This will REPLACE the current database!"
echo "Database: $DATABASE_URL"
echo "Backup: $BACKUP_FILE"
echo ""
echo "Press Ctrl+C to cancel, Enter to continue..."
read

# Stop application
echo "🛑 Stopping application..."
docker-compose stop app

# Create pre-restore backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PRE_RESTORE_BACKUP="backups/pre_restore_$TIMESTAMP.sql.gz"
echo "📦 Creating pre-restore backup: $PRE_RESTORE_BACKUP"
docker-compose exec -T postgres pg_dump -U stockmind stockmind | gzip > "$PRE_RESTORE_BACKUP"

# Drop existing connections
echo "🔌 Dropping existing connections..."
docker-compose exec postgres psql -U stockmind -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='stockmind' AND pid <> pg_backend_pid();"

# Drop and recreate database
echo "🗑️  Dropping database..."
docker-compose exec postgres psql -U stockmind -c "DROP DATABASE IF EXISTS stockmind;"
docker-compose exec postgres psql -U stockmind -c "CREATE DATABASE stockmind;"

# Restore
echo "📥 Restoring from backup..."
gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U stockmind stockmind

echo "✅ Restore completed successfully"
echo ""
echo "Pre-restore backup saved to: $PRE_RESTORE_BACKUP"
echo "Starting application..."
docker-compose start app
```

### Step 3: Setup Cron Job (Production) (30 min)

**File:** `scripts/setup-backup-cron.sh`
```bash
#!/bin/bash
# Setup automated backup cron job

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"

# Create cron job
CRON_JOB="0 3 * * * cd $SCRIPT_DIR/.. && $BACKUP_SCRIPT >> /var/log/stockmind-backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-database.sh"; then
  echo "⚠️  Cron job already exists"
  crontab -l | grep backup-database.sh
else
  # Add cron job
  (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
  echo "✅ Cron job added: Daily backup at 3:00 AM"
fi

# Verify
echo ""
echo "Current crontab:"
crontab -l | grep backup-database.sh
```

### Step 4: Add Backup to Docker Compose (30 min)

**File:** `docker-compose.yml` (add backup service)
```yaml
services:
  # ... existing services ...

  backup:
    image: postgres:16-alpine
    container_name: stockmind-backup
    depends_on:
      - postgres
    volumes:
      - ./backups:/backups
      - ./scripts:/scripts
    environment:
      PGHOST: postgres
      PGUSER: stockmind
      PGPASSWORD: ${POSTGRES_PASSWORD}
      PGDATABASE: stockmind
    command: >
      sh -c "
        echo '0 3 * * * /scripts/backup-database.sh' > /etc/crontabs/root &&
        crond -f
      "
    restart: unless-stopped
    networks:
      - stockmind
```

### Step 5: Test Backup & Restore (1 hour)

**Test Checklist:**
```bash
# Test 1: Manual backup
./scripts/backup-database.sh

# Verify backup file
ls -lh backups/
gunzip -c backups/latest.sql.gz | head -20

# Test 2: Restore
./scripts/restore-database.sh backups/latest.sql.gz

# Verify data after restore
docker-compose exec postgres psql -U stockmind stockmind -c "SELECT COUNT(*) FROM users;"

# Test 3: Cron job (wait 1 minute)
# Add test cron: */1 * * * * (every minute)
./scripts/setup-backup-cron.sh

# Check logs after 1 minute
tail -f /var/log/stockmind-backup.log
```

### Acceptance Criteria
- [ ] Backup script creates compressed SQL dump
- [ ] Restore script successfully restores database
- [ ] Cron job runs daily at 3:00 AM
- [ ] Old backups cleaned up (30+ days)
- [ ] Docker backup service works
- [ ] Documentation updated

---

## Task 1.4: Create Staging Environment
**Priority:** 🔴 CRITICAL
**Estimated Time:** 4 hours
**Dependencies:** Task 1.1, 1.3

### Step 1: Create Staging Configuration (1 hour)

**File:** `docker-compose.staging.yml`
```yaml
version: '3.8'

# Extends docker-compose.yml with staging-specific config
services:
  postgres:
    environment:
      POSTGRES_DB: stockmind_staging
      POSTGRES_USER: stockmind_staging
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD_STAGING}
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data

  app:
    environment:
      NODE_ENV: staging
      DATABASE_URL: postgresql://stockmind_staging:${POSTGRES_PASSWORD_STAGING}@postgres:5432/stockmind_staging
      SESSION_SECRET: ${SESSION_SECRET_STAGING}
      JWT_SECRET: ${JWT_SECRET_STAGING}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS_STAGING}

      # Staging-specific: Enable debug logging
      LOG_LEVEL: debug

      # Use test AI keys (free tier)
      SENTRY_DSN: ${SENTRY_DSN_STAGING}
    ports:
      - "5001:5000"  # Different port than production

volumes:
  postgres_staging_data:
    driver: local
```

**File:** `.env.staging`
```bash
# Staging Environment Configuration

NODE_ENV=staging
PORT=5000

# Database (separate from production!)
DATABASE_URL=postgresql://stockmind_staging:staging_password@localhost:5432/stockmind_staging
POSTGRES_PASSWORD_STAGING=staging_secure_password

# Secrets (different from production!)
SESSION_SECRET_STAGING=<generate unique for staging>
JWT_SECRET_STAGING=<generate unique for staging>

# CORS (staging domain)
ALLOWED_ORIGINS_STAGING=https://staging.yourdomain.com

# Sentry (staging project)
SENTRY_DSN_STAGING=https://staging-dsn@sentry.io/project

# External services (test/free tier keys)
APIFY_API_KEY=<test key>
```

### Step 2: Create Staging Deployment Script (1 hour)

**File:** `scripts/deploy-staging.sh`
```bash
#!/bin/bash
# Deploy to staging environment

set -e

echo "🚀 Deploying to STAGING"
echo "======================="

# 1. Pull latest code
echo "📥 Pulling latest code..."
git fetch origin
git checkout develop  # or staging branch
git pull origin develop

# 2. Load staging environment
echo "🔧 Loading staging configuration..."
export $(cat .env.staging | xargs)

# 3. Backup staging database
echo "📦 Backing up staging database..."
./scripts/backup-database.sh

# 4. Build Docker images
echo "🏗️  Building Docker images..."
docker-compose -f docker-compose.yml -f docker-compose.staging.yml build

# 5. Run database migrations
echo "🔄 Running migrations..."
docker-compose -f docker-compose.yml -f docker-compose.staging.yml run --rm app \
  node server/db/migrate.js

# 6. Deploy
echo "🚀 Starting services..."
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# 7. Health check
echo "🏥 Waiting for health check..."
sleep 10

HEALTH_URL="http://localhost:5001/health"
if curl -f "$HEALTH_URL"; then
  echo "✅ Staging deployment successful!"
  echo "🌐 Access at: https://staging.yourdomain.com"
else
  echo "❌ Health check failed!"
  echo "📋 Logs:"
  docker-compose -f docker-compose.yml -f docker-compose.staging.yml logs app
  exit 1
fi

# 8. Run smoke tests
echo "🧪 Running smoke tests..."
npm run test:smoke -- --env=staging

echo "✅ Staging deployment complete!"
```

### Step 3: Create Smoke Tests (1 hour)

**File:** `__tests__/smoke/staging.test.ts`
```typescript
import { describe, test, expect } from '@jest/globals';

const STAGING_URL = process.env.STAGING_URL || 'http://localhost:5001';

describe('Staging Smoke Tests', () => {
  test('Health endpoint responds', async () => {
    const response = await fetch(`${STAGING_URL}/health`);
    expect(response.status).toBe(200);
  });

  test('Can register new user', async () => {
    const response = await fetch(`${STAGING_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.token).toBeDefined();
  });

  test('API rate limiting works', async () => {
    // Should block after 5 failed auth attempts
    const promises = Array.from({ length: 10 }, (_, i) =>
      fetch(`${STAGING_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'wrong'
        })
      })
    );

    const responses = await Promise.all(promises);
    const blocked = responses.filter(r => r.status === 429);
    expect(blocked.length).toBeGreaterThan(0);
  });

  test('CORS headers present', async () => {
    const response = await fetch(`${STAGING_URL}/api/health`);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
  });

  test('Security headers present', async () => {
    const response = await fetch(`${STAGING_URL}`);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });
});
```

**Add script to package.json:**
```json
{
  "scripts": {
    "test:smoke": "NODE_ENV=test jest --testPathPattern=__tests__/smoke"
  }
}
```

### Step 4: Document Staging Process (30 min)

**File:** `docs/STAGING_ENVIRONMENT.md`
```markdown
# Staging Environment Guide

## Overview
Staging is a production-like environment for testing before production deployment.

## Differences from Production
- Separate database
- Test/free-tier API keys
- Debug logging enabled
- Accessible at: staging.yourdomain.com:5001

## Deployment

### Manual Deployment
```bash
./scripts/deploy-staging.sh
```

### Automatic Deployment (GitHub Actions)
Automatically deploys when PR is merged to `develop` branch.

## Testing on Staging

1. Run smoke tests:
```bash
npm run test:smoke -- --env=staging
```

2. Manual testing checklist:
- [ ] User registration works
- [ ] Login works
- [ ] Instagram source creation works
- [ ] AI scoring works
- [ ] Rate limiting blocks after 5 attempts

## Promoting to Production

After successful staging testing:
1. Merge `develop` → `main`
2. Tag release: `git tag v1.2.3`
3. Deploy to production: `./scripts/deploy-production.sh`

## Rollback

```bash
./scripts/restore-database.sh backups/staging_backup.sql.gz
docker-compose -f docker-compose.staging.yml restart app
```
```

### Acceptance Criteria
- [ ] Staging environment runs on port 5001
- [ ] Separate database from production
- [ ] Deploy script works end-to-end
- [ ] Smoke tests pass
- [ ] Documentation complete

---

# PHASE 2: HIGH PRIORITY (5 days)
**Goal:** Improve quality and performance

---

## Task 2.1: Complete Console.* to Winston Migration
**Priority:** 🟠 HIGH
**Estimated Time:** 8 hours (1 day)
**Dependencies:** None

### Current Status
- ✅ 250+ console.* migrated
- ⏳ ~295 console.* remaining

### Files to Migrate (prioritized by security/importance)

**Priority 1 - Security Critical (4 hours):**
1. `server/routes/api-keys.routes.ts` (3 occurrences)
2. `server/kie-service.ts` (6 occurrences)
3. `server/ig-graph-client.ts` (1 occurrence)

**Priority 2 - High Traffic (2 hours):**
4. `server/apify-service.ts` (15 occurrences)
5. `server/instagram-download.ts` (12 occurrences)

**Priority 3 - Less Critical (2 hours):**
6. `server/vite.ts` (1 occurrence)
7. Any remaining files

### Migration Template

**Before:**
```typescript
console.log(`[Apify] Starting scraping for @${username}...`);
console.error('Apify scraping error:', error);
```

**After:**
```typescript
import { logger } from './lib/logger';
import { logServiceCall } from './lib/logger-helpers';

// Structured logging with context
logger.info('Apify scraping started', {
  service: 'Apify',
  username,
  resultsLimit,
  timestamp: new Date().toISOString()
});

// Error logging with sanitization
logger.error('Apify scraping failed', {
  service: 'Apify',
  username,
  error: error.message,
  // DON'T log: API keys, full stack traces with secrets
  ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
});
```

### Step-by-Step for Each File

#### Example: apify-service.ts

**Step 1: Add imports**
```typescript
import { logger } from './lib/logger';
import { logServiceCall } from './lib/logger-helpers';
```

**Step 2: Replace console.log (informational)**
```typescript
// Line 168: Starting scraping
// BEFORE:
console.log(`[Apify] Starting scraping for Instagram user: @${username} (limit: ${resultsLimit})...`);

// AFTER:
logger.info('Apify scraping started', {
  service: 'Apify',
  operation: 'scrapeReels',
  username,
  resultsLimit
});
```

**Step 3: Replace console.log (success)**
```typescript
// Line 201: Fetch success
// BEFORE:
console.log(`[Apify] ✅ Fetched ${items.length} Reels from @${username}`);

// AFTER:
logger.info('Apify scraping completed', {
  service: 'Apify',
  operation: 'scrapeReels',
  username,
  itemCount: items.length,
  duration: Date.now() - startTime
});
```

**Step 4: Replace console.error**
```typescript
// Line 227: Error
// BEFORE:
console.error('Apify scraping error:', error);

// AFTER:
logger.error('Apify scraping failed', {
  service: 'Apify',
  operation: 'scrapeReels',
  username,
  error: error.message,
  errorCode: error.code,
  // Conditionally include stack in dev only
  ...(process.env.NODE_ENV === 'development' && {
    stack: error.stack
  })
});
```

**Step 5: Replace debug logs**
```typescript
// Line 58, 205-206: Debug info
// BEFORE:
console.log(`[Apify] Normalized duration for ${shortCode}: ${rawDuration} → ${normalizedDuration}s`);
console.log('[Apify] Sample item fields:', Object.keys(items[0]));

// AFTER:
logger.debug('Apify duration normalized', {
  shortCode,
  rawDuration,
  normalizedDuration
});

logger.debug('Apify sample item structure', {
  fields: Object.keys(items[0]),
  sampleItem: items[0]
});
```

### Automation Script

**File:** `scripts/migrate-console-logs.sh`
```bash
#!/bin/bash
# Find remaining console.* usage

echo "🔍 Finding remaining console.* usage..."
echo ""

grep -rn "console\.\(log\|error\|warn\|info\|debug\)" server/ \
  --include="*.ts" \
  --exclude-dir=node_modules \
  | grep -v "// eslint-disable" \
  | wc -l

echo " console.* calls found"
echo ""
echo "Top offenders:"
grep -r "console\." server/ --include="*.ts" | cut -d: -f1 | sort | uniq -c | sort -rn | head -10
```

### Verification

**Run ESLint:**
```bash
# Should show remaining violations
npm run lint

# Expected: ~295 errors initially
# Target: 0 errors
```

**Check specific file:**
```bash
npx eslint server/apify-service.ts
```

### Acceptance Criteria
- [ ] All console.* in priority 1 files replaced
- [ ] All console.* in priority 2 files replaced
- [ ] ESLint shows < 50 console.* violations (80%+ migrated)
- [ ] Winston logs include proper context
- [ ] No sensitive data in logs

---

## Task 2.2: Implement Pagination for All List Endpoints
**Priority:** 🟠 HIGH
**Estimated Time:** 6 hours
**Dependencies:** None

### Endpoints Requiring Pagination

1. `GET /api/instagram/sources` - Instagram sources list
2. `GET /api/instagram/items` - Instagram items list
3. `GET /api/projects` - Projects list (if exists)
4. `GET /api/settings/api-keys` - API keys list

### Step 1: Create Pagination Utilities (1 hour)

**File:** `server/utils/pagination.ts`
```typescript
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const { page, limit } = params;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export function getPaginationOffset(params: PaginationParams): number {
  return (params.page - 1) * params.limit;
}
```

### Step 2: Update Storage Layer (2 hours)

**File:** `server/storage.ts`

**Add pagination methods:**
```typescript
import { PaginationParams, getPaginationOffset } from './utils/pagination';

export class Storage {
  // ... existing methods ...

  async getInstagramItemsPaginated(
    sourceId: string,
    pagination: PaginationParams
  ) {
    const offset = getPaginationOffset(pagination);

    // Get total count
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(instagramItems)
      .where(eq(instagramItems.sourceId, sourceId));

    // Get paginated data
    const items = await this.db
      .select()
      .from(instagramItems)
      .where(eq(instagramItems.sourceId, sourceId))
      .orderBy(desc(instagramItems.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    return { items, total: Number(count) };
  }

  async getInstagramSourcesPaginated(
    userId: string,
    pagination: PaginationParams
  ) {
    const offset = getPaginationOffset(pagination);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(instagramSources)
      .where(eq(instagramSources.userId, userId));

    const sources = await this.db
      .select()
      .from(instagramSources)
      .where(eq(instagramSources.userId, userId))
      .orderBy(desc(instagramSources.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    return { sources, total: Number(count) };
  }

  async getApiKeysPaginated(
    userId: string,
    pagination: PaginationParams
  ) {
    const offset = getPaginationOffset(pagination);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId));

    const keys = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    return { keys, total: Number(count) };
  }
}
```

### Step 3: Update Route Handlers (2 hours)

**Example: `server/routes/instagram-items.routes.ts`**

```typescript
import { paginationSchema, createPaginatedResponse } from '../utils/pagination';

export function registerInstagramItemsRoutes(app: Express) {
  app.get("/api/instagram/items", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Parse and validate pagination params
      const paginationParams = paginationSchema.parse(req.query);

      // Get sourceId from query
      const { sourceId } = req.query;
      if (!sourceId) {
        return res.status(400).json({ message: "sourceId is required" });
      }

      // Fetch paginated data
      const { items, total } = await storage.getInstagramItemsPaginated(
        sourceId as string,
        paginationParams
      );

      // Return paginated response
      const response = createPaginatedResponse(items, total, paginationParams);
      res.json(response);

    } catch (error: any) {
      logger.error('Failed to fetch Instagram items', {
        error: error.message,
        userId: getUserId(req)
      });
      res.status(500).json({ message: "Failed to fetch Instagram items" });
    }
  });
}
```

**Update all endpoints:**
1. `/api/instagram/sources` - Add pagination
2. `/api/instagram/items` - Add pagination
3. `/api/settings/api-keys` - Add pagination

### Step 4: Update Frontend (1 hour)

**File:** `client/src/hooks/use-pagination.ts`
```typescript
import { useState } from 'react';

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function usePagination(initialLimit = 50) {
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
  });

  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const nextPage = () => {
    setPagination(prev => ({
      ...prev,
      page: Math.min(prev.page + 1, prev.totalPages),
    }));
  };

  const prevPage = () => {
    setPagination(prev => ({
      ...prev,
      page: Math.max(prev.page - 1, 1),
    }));
  };

  const updatePagination = (data: PaginationState) => {
    setPagination(data);
  };

  return {
    pagination,
    goToPage,
    nextPage,
    prevPage,
    updatePagination,
  };
}
```

**Update API calls:**
```typescript
// Example: fetching Instagram items
const { data } = await fetch(
  `/api/instagram/items?sourceId=${sourceId}&page=${page}&limit=${limit}`
);

// Response format:
{
  data: [...],
  pagination: {
    page: 1,
    limit: 50,
    total: 250,
    totalPages: 5,
    hasNext: true,
    hasPrev: false
  }
}
```

### Acceptance Criteria
- [ ] All list endpoints support pagination
- [ ] Default limit: 50, max: 100
- [ ] Response includes pagination metadata
- [ ] Frontend components use pagination
- [ ] Performance tested with 1000+ items

---

## Task 2.3: Add Database Indexes
**Priority:** 🟠 HIGH
**Estimated Time:** 4 hours
**Dependencies:** Task 1.1 (migrations)

### Step 1: Analyze Slow Queries (1 hour)

**Enable PostgreSQL query logging:**
```sql
-- In PostgreSQL
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 100; -- log queries > 100ms
SELECT pg_reload_conf();
```

**Monitor slow queries:**
```bash
# Watch PostgreSQL logs
docker-compose logs -f postgres | grep "duration"

# Or query pg_stat_statements
docker-compose exec postgres psql -U stockmind stockmind -c "
  SELECT query, calls, mean_exec_time, max_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"
```

### Step 2: Create Index Migration (2 hours)

**Generate migration:**
```bash
# 1. Add indexes to schema
# 2. Generate migration
npm run db:generate
```

**File:** `shared/schema/indexes.ts`
```typescript
import { index } from 'drizzle-orm/pg-core';
import { instagramItems, instagramSources, apiKeys, users } from './schema';

// Instagram Items indexes
export const instagramItemsIndexes = {
  sourceIdIdx: index('instagram_items_source_id_idx')
    .on(instagramItems.sourceId),

  userIdIdx: index('instagram_items_user_id_idx')
    .on(instagramItems.userId),

  createdAtIdx: index('instagram_items_created_at_idx')
    .on(instagramItems.createdAt),

  // Composite index for common queries
  sourceCreatedIdx: index('instagram_items_source_created_idx')
    .on(instagramItems.sourceId, instagramItems.createdAt),
};

// Instagram Sources indexes
export const instagramSourcesIndexes = {
  userIdIdx: index('instagram_sources_user_id_idx')
    .on(instagramSources.userId),

  createdAtIdx: index('instagram_sources_created_at_idx')
    .on(instagramSources.createdAt),
};

// API Keys indexes
export const apiKeysIndexes = {
  userIdIdx: index('api_keys_user_id_idx')
    .on(apiKeys.userId),

  providerIdx: index('api_keys_provider_idx')
    .on(apiKeys.provider),

  // Composite for active keys lookup
  userProviderIdx: index('api_keys_user_provider_idx')
    .on(apiKeys.userId, apiKeys.provider),
};

// Users indexes
export const usersIndexes = {
  emailIdx: index('users_email_idx')
    .on(users.email),
};
```

**Manual migration SQL (if needed):**
**File:** `drizzle/migrations/0001_add_performance_indexes.sql`
```sql
-- Instagram Items indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS instagram_items_source_id_idx
  ON instagram_items(source_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS instagram_items_user_id_idx
  ON instagram_items(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS instagram_items_created_at_idx
  ON instagram_items(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS instagram_items_source_created_idx
  ON instagram_items(source_id, created_at DESC);

-- Instagram Sources indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS instagram_sources_user_id_idx
  ON instagram_sources(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS instagram_sources_created_at_idx
  ON instagram_sources(created_at DESC);

-- API Keys indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS api_keys_user_id_idx
  ON api_keys(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS api_keys_provider_idx
  ON api_keys(provider);

CREATE INDEX CONCURRENTLY IF NOT EXISTS api_keys_user_provider_idx
  ON api_keys(user_id, provider);

-- Users indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_email_idx
  ON users(email);

-- Add comments
COMMENT ON INDEX instagram_items_source_id_idx IS 'Lookup items by source';
COMMENT ON INDEX instagram_items_source_created_idx IS 'Paginated queries by source and date';
```

**Note:** `CONCURRENTLY` allows adding indexes without locking the table.

### Step 3: Test Index Performance (30 min)

**Before/after comparison:**
```sql
-- BEFORE: Explain query plan without indexes
EXPLAIN ANALYZE
SELECT * FROM instagram_items
WHERE source_id = 'source-123'
ORDER BY created_at DESC
LIMIT 50;

-- Expected: Seq Scan (slow)

-- AFTER: Run migration
-- Check query plan with indexes
EXPLAIN ANALYZE
SELECT * FROM instagram_items
WHERE source_id = 'source-123'
ORDER BY created_at DESC
LIMIT 50;

-- Expected: Index Scan (fast)
```

**Measure improvement:**
```bash
# Load test
ab -n 1000 -c 10 "http://localhost:5000/api/instagram/items?sourceId=source-123"

# Compare before/after
# Target: 2-3x performance improvement
```

### Step 4: Monitor Index Usage (30 min)

**Check if indexes are being used:**
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

**Find unused indexes:**
```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE 'pg_toast%'
ORDER BY tablename, indexname;
```

### Acceptance Criteria
- [ ] Indexes created successfully
- [ ] Query performance improved 2-3x
- [ ] EXPLAIN ANALYZE shows index usage
- [ ] No table locking during index creation
- [ ] All indexes documented

---

[Continuing with remaining tasks...]

## Would you like me to continue with:
- Phase 3 (MEDIUM priority tasks)?
- Phase 4 (Testing & Deployment)?
- Or would you like me to create this as a file and commit it?

---

## Task 2.4: Optimize N+1 Queries
**Priority:** 🟠 HIGH
**Estimated Time:** 4 hours
**Dependencies:** Task 2.3 (indexes)

### Identified N+1 Issues

**Issue 1: Instagram Items with Source Info**
```typescript
// BAD: N+1 query
const items = await storage.getInstagramItems(sourceId);
for (const item of items) {
  const source = await storage.getSource(item.sourceId); // N queries!
}

// GOOD: Use joins
const items = await db
  .select()
  .from(instagramItems)
  .leftJoin(instagramSources, eq(instagramItems.sourceId, instagramSources.id))
  .where(eq(instagramItems.sourceId, sourceId));
```

### Steps
1. Audit all database queries for N+1 patterns
2. Add Drizzle `.with()` or joins where needed
3. Benchmark before/after
4. Document optimizations

### Acceptance Criteria
- [ ] No N+1 queries in hot paths
- [ ] Query count reduced 50%+
- [ ] Response times improved

---

## Task 2.5: Add Unit Tests for Services
**Priority:** 🟠 HIGH  
**Estimated Time:** 6 hours
**Dependencies:** None

### Test Coverage Target: 70%

**Priority services to test:**
1. `apify-service.ts` (Instagram scraping)
2. `ig-sync-service.ts` (Instagram sync)
3. `storage.ts` (database operations)

### Example Test Structure
```typescript
// __tests__/unit/apify-service.test.ts
describe('Apify Service', () => {
  test('scrapeInstagramReels returns valid data', async () => {
    // Mock Apify client
    // Test transformation logic
    // Assert data format
  });

  test('handles rate limiting gracefully', async () => {
    // Mock 429 response
    // Assert retry logic
  });
});
```

### Acceptance Criteria
- [ ] 70%+ code coverage
- [ ] All critical services tested
- [ ] CI runs tests automatically

---

# PHASE 3: MEDIUM PRIORITY (3 days)
**Goal:** Polish and optimize

---

## Task 3.1: Implement Resource Limits
**Priority:** 🟡 MEDIUM
**Estimated Time:** 4 hours

### Limits to Implement

**Database Level:**
```typescript
// Limit max projects per user
const MAX_PROJECTS = 100;
const MAX_INSTAGRAM_SOURCES = 50;
const MAX_API_KEYS_PER_PROVIDER = 5;

// Add validation before insert
if (userProjectCount >= MAX_PROJECTS) {
  throw new Error('Maximum projects limit reached');
}
```

**Application Level:**
```typescript
// Middleware to check limits
export const checkResourceLimits: RequestHandler = async (req, res, next) => {
  const userId = getUserId(req);
  const limits = await storage.getUserResourceUsage(userId);

  if (limits.projects >= MAX_PROJECTS) {
    return res.status(429).json({
      message: 'Resource limit exceeded',
      limit: MAX_PROJECTS,
      current: limits.projects
    });
  }

  next();
};
```

### Acceptance Criteria
- [ ] Limits enforced in API
- [ ] User-friendly error messages
- [ ] Documented in UI

---

## Task 3.2: Add Monitoring & Alerting
**Priority:** 🟡 MEDIUM
**Estimated Time:** 6 hours

### Prometheus Metrics

**File:** `server/lib/metrics.ts`
```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

export const metrics = {
  httpRequests: new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status']
  }),

  httpDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route']
  }),

  dbConnections: new Gauge({
    name: 'db_connections_active',
    help: 'Active database connections'
  }),

  aiRequests: new Counter({
    name: 'ai_requests_total',
    help: 'AI API requests',
    labelNames: ['provider', 'status']
  })
};
```

**Expose metrics:**
```typescript
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Grafana Dashboard
- Create dashboard.json
- Key metrics: response time, error rate, throughput

### Acceptance Criteria
- [ ] Metrics endpoint working
- [ ] Grafana dashboard created
- [ ] Alerts configured

---

## Task 3.3: Improve Error Messages & UX
**Priority:** 🟡 MEDIUM
**Estimated Time:** 4 hours

### User-Facing Error Improvements

**Before:**
```json
{ "message": "Internal Server Error" }
```

**After:**
```json
{
  "error": {
    "code": "AI_PROVIDER_ERROR",
    "message": "AI analysis temporarily unavailable",
    "details": "The AI provider is experiencing issues. Your request will be retried automatically.",
    "retryAfter": 300,
    "supportContact": "support@example.com"
  }
}
```

### Empty States
- "No Instagram sources yet" → Add helpful CTA
- "No API keys" → Link to settings with instructions
- "No projects" → Show onboarding guide

### Acceptance Criteria
- [ ] All empty states improved
- [ ] Error messages user-friendly
- [ ] Links to documentation

---

# PHASE 4: TESTING & DEPLOYMENT (2 days)
**Goal:** Final verification and launch

---

## Task 4.1: Load Testing
**Priority:** 🔵 FINAL
**Estimated Time:** 4 hours

### Load Test Scenarios

**Scenario 1: Normal Load**
```bash
# 100 concurrent users, 1 hour
k6 run --vus 100 --duration 1h load-tests/normal.js
```

**Scenario 2: Spike Load**
```bash
# Sudden spike to 500 users
k6 run load-tests/spike.js
```

**Scenario 3: Soak Test**
```bash
# Sustained load for 8 hours (memory leak detection)
k6 run --vus 50 --duration 8h load-tests/soak.js
```

**File:** `load-tests/normal.js`
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01'],   // <1% failures
  },
};

export default function () {
  // Login
  let loginRes = http.post('http://localhost:5000/api/auth/login', {
    email: 'test@example.com',
    password: 'TestPassword123!'
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  let token = loginRes.json('token');

  // Get Instagram items
  let itemsRes = http.get(
    'http://localhost:5000/api/instagram/items?page=1&limit=50',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  check(itemsRes, {
    'items retrieved': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### Acceptance Criteria
- [ ] p95 latency < 500ms
- [ ] Error rate < 1%
- [ ] No memory leaks in 8h test
- [ ] CPU usage < 80%

---

## Task 4.2: Security Audit
**Priority:** 🔵 FINAL
**Estimated Time:** 4 hours

### Security Checklist

**1. Authentication**
- [ ] JWT tokens expire correctly
- [ ] Refresh token mechanism (if needed)
- [ ] Password reset flow secure
- [ ] Account lockout after failed attempts

**2. Authorization**
- [ ] User can't access other users' data
- [ ] Admin endpoints protected
- [ ] API keys scoped to user

**3. Input Validation**
- [ ] All inputs validated with Zod
- [ ] SQL injection prevented (using ORM)
- [ ] XSS prevented (React escaping + CSP)
- [ ] File upload restrictions

**4. HTTPS/TLS**
- [ ] Force HTTPS in production
- [ ] Valid SSL certificate
- [ ] HSTS header set

**5. Dependencies**
- [ ] No critical vulnerabilities (`npm audit`)
- [ ] Dependencies up to date
- [ ] No unused dependencies

**6. Secrets Management**
- [ ] No secrets in code/repo
- [ ] Environment variables validated
- [ ] Secrets rotated regularly (document process)

### Tools
```bash
# npm audit
npm audit --audit-level=high

# OWASP ZAP (automated security scanner)
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:5000

# Snyk (dependency scanning)
npx snyk test
```

### Acceptance Criteria
- [ ] No HIGH/CRITICAL vulnerabilities
- [ ] OWASP ZAP scan passes
- [ ] Security documentation complete

---

## Task 4.3: Production Deployment Checklist
**Priority:** 🔵 FINAL
**Estimated Time:** 4 hours

### Pre-Deployment Checklist

**Environment Setup:**
- [ ] Production environment variables set
- [ ] ALLOWED_ORIGINS configured correctly
- [ ] DATABASE_URL points to production DB
- [ ] SESSION_SECRET & JWT_SECRET rotated (32+ chars)
- [ ] Sentry DSN configured

**Database:**
- [ ] Backup of current production DB taken
- [ ] Migrations tested on staging
- [ ] Rollback plan documented
- [ ] Database connection pool sized correctly

**Infrastructure:**
- [ ] Docker images built and tested
- [ ] Health checks passing
- [ ] SSL certificate valid
- [ ] DNS configured
- [ ] CDN configured (if applicable)

**Monitoring:**
- [ ] Sentry error tracking active
- [ ] Metrics endpoint accessible
- [ ] Grafana dashboard configured
- [ ] Alerts configured (email/Slack)
- [ ] On-call rotation set

**Communication:**
- [ ] Stakeholders notified of deployment window
- [ ] Status page prepared (if downtime expected)
- [ ] Rollback decision-maker identified

### Deployment Steps

**Step 1: Pre-deployment (T-30min)**
```bash
# 1. Announce maintenance (if needed)
# 2. Final staging test
./scripts/deploy-staging.sh
npm run test:smoke -- --env=staging

# 3. Backup production database
./scripts/backup-database.sh
```

**Step 2: Deployment (T-0)**
```bash
# 1. Pull latest code
git checkout main
git pull origin main

# 2. Build Docker images
docker-compose -f docker-compose.prod.yml build

# 3. Stop application (brief downtime)
docker-compose -f docker-compose.prod.yml stop app

# 4. Run migrations
docker-compose -f docker-compose.prod.yml run --rm app \
  node server/db/migrate.js

# 5. Start new version
docker-compose -f docker-compose.prod.yml up -d

# 6. Wait for health check
sleep 30
curl -f http://localhost:5000/health || exit 1
```

**Step 3: Post-deployment (T+15min)**
```bash
# 1. Smoke test production
npm run test:smoke -- --env=production

# 2. Monitor logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100 app

# 3. Check error rates in Sentry
# 4. Monitor Grafana dashboard

# 5. If issues: ROLLBACK
# ./scripts/rollback-deployment.sh
```

### Rollback Plan

**If deployment fails:**
```bash
# 1. Stop new version
docker-compose -f docker-compose.prod.yml down app

# 2. Restore previous image
docker-compose -f docker-compose.prod.yml up -d \
  --scale app=1 \
  --no-recreate app_backup

# 3. Rollback database (if migration ran)
./scripts/restore-database.sh backups/pre_deployment_backup.sql.gz

# 4. Verify health
curl http://localhost:5000/health

# 5. Notify stakeholders
```

### Acceptance Criteria
- [ ] Zero-downtime deployment (or < 60s)
- [ ] Health checks pass
- [ ] No spike in error rates
- [ ] Performance within acceptable range
- [ ] Rollback plan tested

---

## Task 4.4: Post-Deployment Monitoring
**Priority:** 🔵 FINAL
**Estimated Time:** 2 hours (ongoing)

### First Hour (Critical)
- Monitor error rates every 5 minutes
- Check response times
- Verify core functionality:
  - User registration/login
  - Instagram scraping
  - AI analysis

### First Day
- Check every hour
- Monitor:
  - Memory usage trends
  - Disk space
  - Database connection pool
  - API rate limit hits

### First Week
- Daily checks
- User feedback monitoring
- Performance optimization if needed

### Metrics to Watch

| Metric | Baseline | Alert Threshold |
|--------|----------|-----------------|
| Error Rate | < 0.5% | > 2% |
| p95 Latency | < 500ms | > 1000ms |
| CPU Usage | < 50% | > 80% |
| Memory Usage | < 70% | > 90% |
| Disk Usage | < 60% | > 80% |
| DB Connections | < 20 | > 50 |

### Acceptance Criteria
- [ ] No critical issues in first 24h
- [ ] Performance within targets
- [ ] User feedback positive
- [ ] Team confident in stability

---

# 📅 TIMELINE & MILESTONES

## Week 1: Foundation (CRITICAL)
**Monday-Tuesday:** Database migrations
- Task 1.1: Implement migrations (1 day)
- Task 1.2: Security fixes (0.5 day)

**Wednesday-Thursday:** Infrastructure
- Task 1.3: Automated backups (0.5 day)
- Task 1.4: Staging environment (0.5 day)

**Friday:** Testing & Buffer
- Test all CRITICAL changes
- Fix any issues
- Prepare for Week 2

**Milestone 1:** ✅ Can deploy safely with rollback capability

---

## Week 2: Quality (HIGH)
**Monday-Tuesday:** Logging & Pagination
- Task 2.1: Console.* migration (1 day)
- Task 2.2: Pagination (0.75 day)

**Wednesday:** Performance
- Task 2.3: Database indexes (0.5 day)
- Task 2.4: N+1 optimization (0.5 day)

**Thursday-Friday:** Testing
- Task 2.5: Unit tests (0.75 day)
- Integration testing

**Milestone 2:** ✅ 70% test coverage, 90% Winston logging

---

## Week 3: Polish & Launch (MEDIUM + FINAL)
**Monday:** Optimization
- Task 3.1: Resource limits (0.5 day)
- Task 3.2: Monitoring setup (0.75 day)

**Tuesday:** UX
- Task 3.3: Error messages & empty states (0.5 day)

**Wednesday:** Testing
- Task 4.1: Load testing (0.5 day)
- Task 4.2: Security audit (0.5 day)

**Thursday:** Deployment Prep
- Task 4.3: Deployment checklist (0.5 day)
- Final staging test
- Production deployment

**Friday:** Monitoring
- Task 4.4: Post-deployment monitoring
- Fix any issues
- Celebrate! 🎉

**Milestone 3:** ✅ PRODUCTION LAUNCH

---

# 📋 DAILY CHECKLIST

## Developer's Daily Routine

### Morning (15 min)
- [ ] Pull latest from `develop` branch
- [ ] Review task for the day
- [ ] Check Sentry for overnight errors
- [ ] Check GitHub Actions status

### During Development
- [ ] Create feature branch: `feature/task-X.X-description`
- [ ] Write failing test first (TDD)
- [ ] Implement feature
- [ ] Write/update documentation
- [ ] Update IMPLEMENTATION_PLAN.md checklist
- [ ] Run tests locally: `npm run test`
- [ ] Run linter: `npm run lint:fix`

### Before Commit
- [ ] All tests pass
- [ ] No console.* (ESLint clean)
- [ ] No TypeScript errors
- [ ] Code reviewed by self
- [ ] Commit message descriptive

### End of Day (10 min)
- [ ] Push work to GitHub
- [ ] Update task status in project board
- [ ] Document blockers/questions
- [ ] Plan tomorrow's tasks

---

# 🚦 GO/NO-GO CRITERIA

## Before Staging Deployment
- [ ] All Phase 1 (CRITICAL) tasks complete
- [ ] Migrations tested on dev database
- [ ] Backups working
- [ ] No TypeScript errors
- [ ] ESLint passing

## Before Production Deployment
- [ ] All Phase 1 + Phase 2 tasks complete
- [ ] 70%+ test coverage achieved
- [ ] Load testing passed
- [ ] Security audit passed
- [ ] Staging stable for 48+ hours
- [ ] Rollback plan documented and tested
- [ ] On-call engineer identified
- [ ] Stakeholders approved

## Rollback Triggers
Rollback if any of these occur in first 30 minutes:
- Error rate > 5%
- p95 latency > 2000ms
- Critical functionality broken
- Database corruption detected
- CPU/Memory > 95% sustained

---

# 📞 CONTACTS & ESCALATION

## Team Contacts
- **Primary Developer:** [Your Name] - [Email/Slack]
- **DevOps:** [Name] - [Email/Slack]
- **On-Call:** [Rotation schedule]

## Escalation Path
1. **Developer** → Fix if < 15 min
2. **Tech Lead** → If > 15 min or unclear
3. **CTO** → If user-impacting outage
4. **Rollback** → If no fix in 30 min

## External Contacts
- **Cloud Provider Support:** [Link to dashboard]
- **Database Support:** [Neon support email]
- **Sentry Support:** [Link]

---

# 📊 TRACKING PROGRESS

## Current Status (Update Daily)

| Phase | Status | Progress | Blockers |
|-------|--------|----------|----------|
| Phase 1: CRITICAL | 🟡 In Progress | 0/4 | None |
| Phase 2: HIGH | ⚪ Not Started | 0/5 | Phase 1 |
| Phase 3: MEDIUM | ⚪ Not Started | 0/3 | Phase 2 |
| Phase 4: FINAL | ⚪ Not Started | 0/4 | Phase 3 |

**Overall Progress:** 0% → Target: 100% by Week 3

## Task Status Legend
- ✅ Complete
- 🟢 On Track
- 🟡 At Risk
- 🔴 Blocked
- ⚪ Not Started

---

# 🎯 SUCCESS METRICS

## Technical Metrics
- [ ] Production Readiness Score: 5.4 → 9.0+
- [ ] Test Coverage: 0% → 70%+
- [ ] Winston Logging: 45% → 90%+
- [ ] Response Time p95: <500ms
- [ ] Error Rate: <1%
- [ ] Uptime: >99.9%

## Business Metrics
- [ ] Zero data loss incidents
- [ ] Zero security incidents
- [ ] <1 hour total downtime
- [ ] User complaints <5 (first week)

---

# 📝 NOTES

## Lessons Learned (Update After Each Phase)

### Phase 1:
- [TBD]

### Phase 2:
- [TBD]

### Phase 3:
- [TBD]

### Phase 4:
- [TBD]

## Process Improvements
- [TBD]

---

**Plan Version:** 1.0
**Last Updated:** 2025-11-24
**Next Review:** After Phase 1 completion

