# Database Migration System

**Status:** ✅ Implemented
**Version:** 1.0
**Last Updated:** 2025-11-24

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Migration Workflow](#migration-workflow)
4. [Commands](#commands)
5. [Production Deployment](#production-deployment)
6. [Rollback Procedures](#rollback-procedures)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Migration File Structure](#migration-file-structure)

---

## Overview

StockMind uses **Drizzle ORM** for database migrations with a custom migration runner for production safety.

### What Changed?

**DEPRECATED: `npm run db:push`**
❌ Directly modifies database without history
❌ No rollback capability
❌ Dangerous in production

**NEW: Migration-based workflow**
✅ Version-controlled database changes
✅ Rollback capability
✅ Audit trail in `__drizzle_migrations` table
✅ Safe for production

### Key Files

```
StockMind/
├── drizzle.config.ts                 # Drizzle configuration
├── drizzle/
│   └── migrations/                   # Generated SQL migrations
│       ├── 0000_initial.sql
│       ├── 0001_add_feature.sql
│       └── rollback/                 # Rollback SQL (manual)
│           ├── README.md
│           └── 0001_add_feature.sql
├── server/db/
│   ├── migrate.ts                    # Migration runner
│   └── rollback.ts                   # Rollback script
├── docker-entrypoint.sh              # Runs migrations on startup
└── Dockerfile                        # Includes migration support
```

---

## Quick Start

### Local Development

```bash
# 1. Modify database schema
vim shared/schema.ts

# 2. Generate migration SQL
npm run db:generate

# 3. Review generated SQL
cat drizzle/migrations/0001_*.sql

# 4. Apply migration
npm run db:migrate

# 5. Verify in Drizzle Studio
npm run db:studio
```

### Production Deployment

```bash
# Migrations run automatically on Docker container startup
docker-compose up -d

# Check migration logs
docker-compose logs app | grep -A 20 "Running database migrations"
```

---

## Migration Workflow

### Step 1: Modify Schema

Edit `shared/schema.ts`:

```typescript
// shared/schema.ts
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  // ✨ Add new field
  emailVerified: boolean("email_verified").default(false),
});
```

### Step 2: Generate Migration

```bash
npm run db:generate
```

**Output:**
```
✓ Generating migrations...
✓ Generated migration: drizzle/migrations/0001_add_email_verified.sql
✓ Migration file created successfully
```

**Generated SQL:**
```sql
-- drizzle/migrations/0001_add_email_verified.sql
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false;
```

### Step 3: Review Migration SQL

**CRITICAL:** Always review generated SQL before applying!

```bash
cat drizzle/migrations/0001_add_email_verified.sql
```

Check for:
- ✅ Correct table/column names
- ✅ Appropriate data types
- ✅ Proper constraints (NOT NULL, DEFAULT, etc.)
- ⚠️ Destructive operations (DROP TABLE, DROP COLUMN)
- ⚠️ Data migrations (UPDATE statements)

### Step 4: Create Rollback SQL (Recommended)

```bash
# Create rollback file
cat > drizzle/migrations/rollback/0001_add_email_verified.sql << 'EOF'
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified";
EOF
```

See [drizzle/migrations/rollback/README.md](drizzle/migrations/rollback/README.md) for detailed instructions.

### Step 5: Test on Development Database

```bash
# Apply migration
npm run db:migrate

# Verify schema
npm run db:studio
# Check that "email_verified" column exists in users table
```

### Step 6: Test Rollback (Optional)

```bash
# Rollback the migration
npm run db:rollback -- --steps=1

# Verify column removed
npm run db:studio

# Re-apply migration
npm run db:migrate
```

### Step 7: Commit to Git

```bash
git add drizzle/migrations/0001_*.sql
git add drizzle/migrations/rollback/0001_*.sql  # if created
git add shared/schema.ts
git commit -m "feat: Add email_verified column to users table"
git push
```

### Step 8: Deploy to Staging

```bash
# On staging server
git pull
docker-compose restart app

# Migrations run automatically on container startup
docker-compose logs -f app
```

### Step 9: Verify on Staging

```bash
# Check migration was applied
docker-compose exec postgres psql -U stockmind -c \
  "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1"

# Verify schema
docker-compose exec postgres psql -U stockmind -c \
  "\d users"
```

### Step 10: Deploy to Production

```bash
# ⚠️ BACKUP DATABASE FIRST!
./scripts/backup-database.sh

# Deploy
git pull
docker-compose restart app

# Monitor startup logs
docker-compose logs -f app | grep -A 30 "Running database migrations"
```

---

## Commands

### `npm run db:generate`

**Purpose:** Generate migration SQL from schema changes

**Usage:**
```bash
npm run db:generate
```

**What it does:**
1. Compares `shared/schema.ts` with current database schema
2. Generates SQL to migrate database to match schema
3. Creates file in `drizzle/migrations/XXXX_name.sql`

**When to use:**
- After modifying `shared/schema.ts`
- Before deploying schema changes

---

### `npm run db:migrate`

**Purpose:** Apply pending migrations to database

**Usage:**
```bash
# Local development
npm run db:migrate

# Custom database URL
DATABASE_URL="postgresql://user:pass@host:5432/db" npm run db:migrate
```

**What it does:**
1. Connects to database
2. Reads `drizzle/migrations/` directory
3. Checks `__drizzle_migrations` table for applied migrations
4. Applies only new/pending migrations
5. Records applied migrations in `__drizzle_migrations` table

**Output:**
```
[Migration] Starting database migrations...
[Migration] Testing database connection...
[Migration] ✅ Database connection successful
[Migration] Applying migrations from: ./drizzle/migrations
[Migration] ✅ Migrations completed successfully
[Migration] Recently applied migrations: [...]
```

**Safety:**
- ✅ Idempotent (safe to run multiple times)
- ✅ Only applies pending migrations
- ✅ Transactional (all or nothing)

---

### `npm run db:rollback`

**Purpose:** Revert previously applied migrations

**Usage:**
```bash
# Rollback last migration
npm run db:rollback

# Rollback last 3 migrations
npm run db:rollback -- --steps=3

# Rollback to specific migration
npm run db:rollback -- --to=0001_initial

# Production rollback (requires confirmation)
NODE_ENV=production npm run db:rollback -- --confirm --steps=1
```

**Requirements:**
- Rollback SQL files must exist in `drizzle/migrations/rollback/`
- See [Rollback Procedures](#rollback-procedures)

---

### `npm run db:studio`

**Purpose:** Visual database browser (Drizzle Studio)

**Usage:**
```bash
npm run db:studio
```

Opens web interface at `https://local.drizzle.studio`

---

### `npm run db:push` (DEPRECATED)

**Status:** ⚠️ **DEPRECATED**

```bash
$ npm run db:push
⚠️  DEPRECATED: Use db:migrate instead
```

**Why deprecated:**
- No migration history
- No rollback capability
- Dangerous for production

**Migration path:**
1. Use `npm run db:generate` instead
2. Use `npm run db:migrate` to apply

---

## Production Deployment

### Docker Deployment (Automatic Migrations)

Migrations run **automatically** on container startup via `docker-entrypoint.sh`.

**Flow:**
1. Container starts
2. `docker-entrypoint.sh` executes
3. Validates `DATABASE_URL` is set
4. Runs `node dist/db/migrate.js`
5. If migrations succeed → starts application
6. If migrations fail → container exits with error

**docker-compose.yml:**
```yaml
services:
  app:
    build: .
    environment:
      DATABASE_URL: postgresql://stockmind:password@postgres:5432/stockmind
    depends_on:
      postgres:
        condition: service_healthy
```

**Deployment:**
```bash
# Deploy new version
git pull
docker-compose build app
docker-compose up -d app

# Monitor startup (including migrations)
docker-compose logs -f app
```

**Expected logs:**
```
=========================================
StockMind Production Startup
=========================================

✓ Environment variables validated

Running database migrations...
[Migration] Starting database migrations...
[Migration] ✅ Migrations completed successfully

=========================================
Starting StockMind Application
=========================================
Server running on port 5000
```

### Manual Production Deployment

If not using Docker:

```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Pull latest code
git pull

# 3. Install dependencies
npm ci --omit=dev

# 4. Run migrations
npm run db:migrate

# 5. Restart application
pm2 restart stockmind
```

---

## Rollback Procedures

### When to Rollback

- ❌ Migration failed during deployment
- ❌ Migration caused application errors
- ❌ Migration caused data corruption
- ❌ Need to revert feature to previous version

### Emergency Rollback (Production)

**⚠️ ALWAYS BACKUP FIRST!**

#### Option 1: Using Rollback Script (Preferred)

```bash
# 1. Backup database
docker-compose exec postgres pg_dump -U stockmind stockmind > \
  emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Stop application
docker-compose stop app

# 3. Rollback migrations
docker-compose exec app sh -c \
  "NODE_ENV=production npm run db:rollback -- --confirm --steps=1"

# 4. Deploy previous application version
git checkout <previous-commit>
docker-compose build app
docker-compose start app

# 5. Verify
docker-compose logs -f app
curl http://localhost:5000/health
```

#### Option 2: Database Restore from Backup

```bash
# 1. Stop application
docker-compose stop app

# 2. Restore database
docker-compose exec postgres psql -U stockmind -c "DROP DATABASE stockmind"
docker-compose exec postgres psql -U stockmind -c "CREATE DATABASE stockmind"
cat backup_YYYYMMDD_HHMMSS.sql | docker-compose exec -T postgres \
  psql -U stockmind stockmind

# 3. Deploy previous application version
git checkout <previous-commit>
docker-compose up -d --build app

# 4. Verify
docker-compose logs -f app
```

### Development Rollback

```bash
# Rollback last migration
npm run db:rollback

# Verify
npm run db:studio
```

---

## Best Practices

### ✅ DO

1. **Always review generated SQL** before applying
   ```bash
   npm run db:generate
   cat drizzle/migrations/0001_*.sql  # Review!
   npm run db:migrate
   ```

2. **Create rollback SQL** for complex migrations
   ```bash
   # After generating migration
   vim drizzle/migrations/rollback/0001_*.sql
   ```

3. **Test migrations** on development first
   ```bash
   # Dev database
   npm run db:migrate
   npm run db:studio  # Verify
   npm run db:rollback  # Test rollback
   npm run db:migrate  # Re-apply
   ```

4. **Backup before production migrations**
   ```bash
   docker-compose exec postgres pg_dump -U stockmind stockmind > backup.sql
   ```

5. **Use staging environment** before production
   ```bash
   # Deploy to staging first
   # Test application thoroughly
   # Then deploy to production
   ```

6. **Keep migrations small and focused**
   - One logical change per migration
   - Easier to review and rollback

7. **Add data migrations carefully**
   ```sql
   -- Good: Handles NULL values
   UPDATE users SET status = 'active' WHERE status IS NULL;
   ALTER TABLE users ALTER COLUMN status SET NOT NULL;

   -- Bad: Fails if NULL values exist
   ALTER TABLE users ALTER COLUMN status SET NOT NULL;
   ```

### ❌ DON'T

1. **Don't edit applied migrations**
   - Once committed and applied, migrations are immutable
   - Create a new migration instead

2. **Don't use `db:push` in production**
   - No migration history
   - Use `db:migrate` instead

3. **Don't skip migration generation**
   ```bash
   # ❌ BAD
   npm run db:push

   # ✅ GOOD
   npm run db:generate
   npm run db:migrate
   ```

4. **Don't deploy without testing migrations**
   - Test on dev first
   - Then staging
   - Then production

5. **Don't create breaking schema changes** without backward compatibility
   ```sql
   -- ❌ BAD: Breaks old application code
   ALTER TABLE users DROP COLUMN email;

   -- ✅ GOOD: Phased approach
   -- Migration 1: Add new column
   ALTER TABLE users ADD COLUMN email_address TEXT;

   -- Deploy application version that uses both columns

   -- Migration 2: Migrate data
   UPDATE users SET email_address = email WHERE email_address IS NULL;

   -- Deploy application version that only uses email_address

   -- Migration 3: Drop old column
   ALTER TABLE users DROP COLUMN email;
   ```

---

## Troubleshooting

### Migration fails: "DATABASE_URL environment variable is required"

**Cause:** DATABASE_URL not set

**Fix:**
```bash
# Set in .env file
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/stockmind" >> .env

# Or pass as environment variable
DATABASE_URL="postgresql://..." npm run db:migrate
```

---

### Migration fails: "relation already exists"

**Cause:** Schema already modified by previous `db:push`

**Symptoms:**
```
ERROR: relation "users" already exists
```

**Fix:**

**Option 1: Mark migration as applied** (if schema is already correct)
```bash
# Connect to database
psql $DATABASE_URL

# Insert migration record
INSERT INTO __drizzle_migrations (hash, created_at)
VALUES ('0001_fancy_name', NOW());
```

**Option 2: Regenerate migration**
```bash
# Delete old migration
rm drizzle/migrations/0001_*.sql

# Regenerate (will detect current schema)
npm run db:generate
```

---

### Migration fails: "permission denied"

**Cause:** Database user lacks CREATE TABLE permission

**Fix:**
```sql
-- Grant required permissions
GRANT CREATE ON DATABASE stockmind TO stockmind_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO stockmind_user;
```

---

### Rollback fails: "rollback SQL not found"

**Cause:** No rollback SQL file created

**Fix:**
```bash
# Create rollback SQL file
cat > drizzle/migrations/rollback/0001_fancy_name.sql << 'EOF'
-- Write SQL to undo migration
DROP TABLE IF EXISTS new_table;
EOF

# Retry rollback
npm run db:rollback -- --steps=1
```

---

### Docker container exits immediately after startup

**Cause:** Migration failed

**Diagnosis:**
```bash
# Check logs
docker-compose logs app | grep -A 30 "Running database migrations"
```

**Common causes:**
1. Database not ready → Fix: Ensure `depends_on` with health check
2. Invalid DATABASE_URL → Fix: Check environment variables
3. Migration SQL error → Fix: Check migration SQL syntax

---

### How to check migration history?

```sql
-- Connect to database
psql $DATABASE_URL

-- View migration history
SELECT id, hash, created_at
FROM __drizzle_migrations
ORDER BY created_at DESC;
```

**Or via Docker:**
```bash
docker-compose exec postgres psql -U stockmind -c \
  "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC"
```

---

## Migration File Structure

### Migration SQL (`drizzle/migrations/XXXX_name.sql`)

**Naming:** `<number>_<snake_case_description>.sql`

**Example:**
```sql
-- File: drizzle/migrations/0001_add_email_verified.sql

-- Add email_verified column
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false;

-- Add index for faster queries
CREATE INDEX "idx_users_email_verified" ON "users" ("email_verified");

-- Migrate existing data
UPDATE "users" SET "email_verified" = true WHERE "email" LIKE '%@verified-domain.com';
```

### Rollback SQL (`drizzle/migrations/rollback/XXXX_name.sql`)

**Must reverse all operations** in migration SQL

**Example:**
```sql
-- File: drizzle/migrations/rollback/0001_add_email_verified.sql

-- Reverse operations in opposite order

-- Drop index
DROP INDEX IF EXISTS "idx_users_email_verified";

-- Drop column
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified";

-- Note: Cannot reverse data migration (UPDATE)
-- Users who were marked as verified will lose that status
```

### Migration History Table

**Table:** `__drizzle_migrations`

**Schema:**
```sql
CREATE TABLE __drizzle_migrations (
  id serial PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint NOT NULL
);
```

**Example data:**
```
 id |              hash              | created_at
----+--------------------------------+-------------
  1 | 0000_empty_captain_flint       | 1732454123000
  2 | 0001_add_email_verified        | 1732454567000
  3 | 0002_add_user_roles            | 1732456789000
```

---

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle Migrations Guide](https://orm.drizzle.team/docs/migrations)
- [RUNBOOK.md](./RUNBOOK.md) - Operations handbook
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Full implementation plan
- [drizzle/migrations/rollback/README.md](./drizzle/migrations/rollback/README.md) - Rollback guide

---

**Questions or Issues?**
See [RUNBOOK.md](./RUNBOOK.md) for emergency procedures or escalation contacts.
