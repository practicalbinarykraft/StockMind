# Migration Rollback SQL

This directory contains SQL scripts to rollback (undo) migrations.

## Why Rollback Files?

Drizzle ORM doesn't generate automatic "down" migrations. If a deployment fails or causes issues, you need a way to safely revert database changes.

## How to Create Rollback SQL

### 1. After generating a migration:

```bash
npm run db:generate
# Creates: drizzle/migrations/0001_fancy_name.sql
```

### 2. Analyze the migration SQL to understand what changed:

- Tables created → Need DROP TABLE
- Columns added → Need DROP COLUMN (or ALTER TABLE DROP COLUMN)
- Indexes created → Need DROP INDEX
- Constraints added → Need DROP CONSTRAINT

### 3. Create corresponding rollback file:

```bash
# Copy the migration number
cp drizzle/migrations/0001_fancy_name.sql drizzle/migrations/rollback/0001_fancy_name.sql
```

### 4. Edit rollback file to reverse the operations:

**Example - Forward Migration (0001_fancy_name.sql):**
```sql
CREATE TABLE "users" (
  "id" serial PRIMARY KEY,
  "email" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX "idx_users_email" ON "users" ("email");
```

**Corresponding Rollback (rollback/0001_fancy_name.sql):**
```sql
DROP INDEX IF EXISTS "idx_users_email";
DROP TABLE IF EXISTS "users";
```

### 5. Test rollback SQL (on development database):

```bash
# Apply migration
npm run db:migrate

# Rollback migration
npm run db:rollback -- --steps=1

# Verify database state
npm run db:studio
```

## Rollback Command Usage

### Rollback last migration:
```bash
npm run db:rollback
# or
npm run db:rollback -- --steps=1
```

### Rollback last 3 migrations:
```bash
npm run db:rollback -- --steps=3
```

### Rollback to specific migration:
```bash
npm run db:rollback -- --to=0001_fancy_name
```

### Production rollback (requires confirmation):
```bash
# ⚠️ ALWAYS backup database first!
NODE_ENV=production npm run db:rollback -- --confirm --steps=1
```

## Best Practices

### ✅ DO:
- Create rollback SQL immediately after generating migrations
- Test rollback on development database
- Keep rollback SQL simple and idempotent
- Use `IF EXISTS` clauses to make rollbacks safe to run multiple times
- Document any manual data migration steps in comments

### ❌ DON'T:
- Rollback in production without database backup
- Create destructive rollbacks that delete user data without backup
- Rely on automatic rollbacks - always test manually first
- Skip creating rollback files for "simple" migrations

## When Rollback SQL Isn't Needed

Some migrations are **additive only** and don't need rollback:
- Adding new tables that don't affect existing features
- Adding nullable columns
- Creating new indexes (can be dropped without data loss)

In these cases, you can skip creating rollback SQL, but document this decision:

```bash
# In rollback directory, create a note file:
echo "No rollback needed - additive migration" > rollback/0001_fancy_name.txt
```

## Emergency: Manual Rollback

If rollback script fails:

1. **Restore from backup:**
   ```bash
   # See RUNBOOK.md for backup restoration
   docker-compose exec postgres psql -U stockmind < backup.sql
   ```

2. **Manual SQL execution:**
   ```bash
   # Connect to database
   docker-compose exec postgres psql -U stockmind stockmind

   # Execute rollback SQL manually
   DROP TABLE IF EXISTS "new_table";

   # Remove from migration history
   DELETE FROM __drizzle_migrations WHERE hash LIKE '%0001_fancy_name%';
   ```

## Examples

### Example 1: Adding a table

**Migration (0002_add_notifications.sql):**
```sql
CREATE TABLE "notifications" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "message" text NOT NULL,
  "read" boolean DEFAULT false
);

CREATE INDEX "idx_notifications_user_id" ON "notifications" ("user_id");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
```

**Rollback (rollback/0002_add_notifications.sql):**
```sql
-- Drop foreign key first
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_fkey";

-- Drop index
DROP INDEX IF EXISTS "idx_notifications_user_id";

-- Drop table
DROP TABLE IF EXISTS "notifications";
```

### Example 2: Adding a column

**Migration (0003_add_user_verified.sql):**
```sql
ALTER TABLE "users" ADD COLUMN "verified" boolean DEFAULT false;
CREATE INDEX "idx_users_verified" ON "users" ("verified");
```

**Rollback (rollback/0003_add_user_verified.sql):**
```sql
DROP INDEX IF EXISTS "idx_users_verified";
ALTER TABLE "users" DROP COLUMN IF EXISTS "verified";
```

### Example 3: Data migration

**Migration (0004_migrate_status_enum.sql):**
```sql
-- Add new column
ALTER TABLE "projects" ADD COLUMN "status_new" text;

-- Migrate data
UPDATE "projects" SET "status_new" =
  CASE
    WHEN "status" = 0 THEN 'draft'
    WHEN "status" = 1 THEN 'active'
    WHEN "status" = 2 THEN 'completed'
  END;

-- Drop old column
ALTER TABLE "projects" DROP COLUMN "status";

-- Rename new column
ALTER TABLE "projects" RENAME COLUMN "status_new" TO "status";
```

**Rollback (rollback/0004_migrate_status_enum.sql):**
```sql
-- Add numeric column back
ALTER TABLE "projects" ADD COLUMN "status_old" integer;

-- Reverse data migration
UPDATE "projects" SET "status_old" =
  CASE
    WHEN "status" = 'draft' THEN 0
    WHEN "status" = 'active' THEN 1
    WHEN "status" = 'completed' THEN 2
  END;

-- Drop text column
ALTER TABLE "projects" DROP COLUMN "status";

-- Rename numeric column
ALTER TABLE "projects" RENAME COLUMN "status_old" TO "status";
```

## See Also

- [RUNBOOK.md](../../../RUNBOOK.md) - Database backup/restore procedures
- [IMPLEMENTATION_PLAN.md](../../../IMPLEMENTATION_PLAN.md) - Migration system implementation plan
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations) - Official documentation
