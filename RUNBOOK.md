# StockMind Runbook
**Operations Guide for Production**

---

## 🚀 Quick Start

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start PostgreSQL (Docker)
docker run -d --name stockmind-postgres \
  -e POSTGRES_DB=stockmind \
  -e POSTGRES_USER=stockmind \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 postgres:16

# 4. Push database schema
npm run db:push

# 5. Start development server
npm run dev
```

### Production Deployment (Docker Compose)
```bash
# 1. Clone repository
git clone https://github.com/your-org/StockMind.git
cd StockMind

# 2. Configure environment
cp .env.example .env
nano .env  # Set all REQUIRED variables

# 3. Start services
docker-compose up -d

# 4. Check health
curl http://localhost:5000/health

# 5. View logs
docker-compose logs -f app
```

---

## 📋 Environment Variables

### Required (Must be set in production)
```bash
DATABASE_URL=postgresql://user:password@host:5432/stockmind
SESSION_SECRET=<generate with: openssl rand -base64 32>
JWT_SECRET=<generate with: openssl rand -base64 32>
ALLOWED_ORIGINS=https://yourdomain.com
NODE_ENV=production
```

### Optional
```bash
SENTRY_DSN=<for error tracking>
APIFY_API_KEY=<for Instagram scraping>
```

---

## 🔥 Emergency Procedures

### 1. Application Down / Not Responding

**Symptoms:**
- Health check failing
- 502/503 errors
- Container not running

**Diagnosis:**
```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs --tail=100 app

# Check database connection
docker-compose exec postgres psql -U stockmind -c "SELECT 1"
```

**Quick Fix:**
```bash
# Restart application
docker-compose restart app

# If that doesn't work, rebuild
docker-compose down
docker-compose up -d --build
```

**Root Cause Analysis:**
1. Check `docker-compose logs app` for errors
2. Common causes:
   - Database connection failed (check DATABASE_URL)
   - Missing environment variables
   - Out of memory
   - Port already in use

---

### 2. Database Migration Failed

**Symptoms:**
- Application won't start
- "relation does not exist" errors
- Schema mismatch errors

**Rollback:**
```bash
# Currently using drizzle-kit push (no migrations yet)
# To rollback: restore from backup

# 1. Stop application
docker-compose stop app

# 2. Restore database
docker-compose exec postgres psql -U stockmind < /backups/stockmind_backup.sql

# 3. Start application
docker-compose start app
```

**Prevention:**
- ⚠️ TODO: Implement proper migrations with drizzle-kit generate
- Always test migrations on staging first
- Always backup before migration

---

### 3. AI Provider Down (Anthropic/OpenAI)

**Symptoms:**
- AI scoring/analysis fails
- 500 errors from `/api/ai/*`
- Rate limit errors

**Quick Fix:**
```bash
# Check AI provider status
curl https://status.anthropic.com
curl https://status.openai.com

# If provider is down:
# 1. Inform users (set maintenance banner)
# 2. Queue failed requests for retry
# 3. Switch to alternative provider if available
```

**User Communication:**
```
⚠️ AI services temporarily unavailable
Due to [Provider Name] outage, AI analysis is delayed.
Your requests are queued and will process automatically when service resumes.
```

---

### 4. Disk Space Full

**Symptoms:**
- Write errors
- Upload failures
- Database errors

**Diagnosis:**
```bash
# Check disk usage
df -h

# Check uploads folder
du -sh /app/uploads

# Check logs
du -sh /app/logs

# Check PostgreSQL
docker-compose exec postgres du -sh /var/lib/postgresql/data
```

**Quick Fix:**
```bash
# 1. Clean old uploads (if policy allows)
find /app/uploads -mtime +90 -delete

# 2. Rotate logs
docker-compose exec app sh -c "find /app/logs -name '*.log' -mtime +30 -delete"

# 3. Vacuum database
docker-compose exec postgres psql -U stockmind -c "VACUUM FULL"
```

---

### 5. Memory Leak / High Memory Usage

**Symptoms:**
- Slow response times
- OOM errors
- Container restarts

**Diagnosis:**
```bash
# Check container memory
docker stats stockmind-app

# Check Node.js heap usage
docker-compose exec app node -e "console.log(process.memoryUsage())"
```

**Quick Fix:**
```bash
# 1. Restart application
docker-compose restart app

# 2. Limit memory in docker-compose.yml
services:
  app:
    mem_limit: 1g
    mem_reservation: 512m
```

**Long-term Fix:**
- Profile with `--inspect` flag
- Check for:
  - Large arrays not being freed
  - Event listeners not removed
  - Cached data growing unbounded

---

### 6. User Accidentally Deleted Project

**Symptoms:**
- User reports deleted project
- Project not in database

**Recovery:**
```bash
# 1. Check if soft-deleted (if implemented)
docker-compose exec postgres psql -U stockmind -c \
  "SELECT * FROM projects WHERE id='<project-id>' AND deleted_at IS NOT NULL"

# 2. If not soft-deleted, restore from backup
# Find most recent backup
ls -lt /backups/

# Restore specific project (requires manual SQL)
# This is complex - contact DBA
```

**Prevention:**
- Implement soft deletes (add `deleted_at` column)
- Add "Are you sure?" confirmation
- Keep backups for 30 days

---

### 7. CORS Errors / "Origin not allowed"

**Symptoms:**
- Frontend can't connect to API
- CORS errors in browser console
- `403 Forbidden` on CORS preflight

**Quick Fix:**
```bash
# 1. Check current ALLOWED_ORIGINS
docker-compose exec app printenv ALLOWED_ORIGINS

# 2. Update in .env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://new-domain.com

# 3. Restart
docker-compose restart app
```

**Important:**
- NEVER set `ALLOWED_ORIGINS=*` in production
- Always use https:// in production

---

## 🔧 Maintenance Tasks

### Daily

**1. Check Application Health**
```bash
curl http://localhost:5000/health
```

**2. Monitor Logs for Errors**
```bash
docker-compose logs --tail=100 app | grep -i error
```

**3. Check Disk Space**
```bash
df -h | grep -E '(Filesystem|/$)'
```

---

### Weekly

**1. Database Backup**
```bash
# Manual backup
docker-compose exec postgres pg_dump -U stockmind stockmind > \
  /backups/stockmind_$(date +%Y%m%d).sql

# Verify backup
ls -lh /backups/
```

**2. Clean Old Uploads**
```bash
# Delete uploads older than 90 days
find /app/uploads -mtime +90 -type f -delete
```

**3. Review Error Logs**
```bash
# Check for recurring errors
docker-compose logs app --since 7d | grep ERROR | sort | uniq -c | sort -nr
```

---

### Monthly

**1. Update Dependencies**
```bash
# Check for updates
npm outdated

# Update (test in staging first!)
npm update
npm audit fix
```

**2. Vacuum Database**
```bash
docker-compose exec postgres psql -U stockmind -c "VACUUM ANALYZE"
```

**3. Test Backup Restoration**
```bash
# CRITICAL: Test on staging, NOT production
# 1. Create test database
# 2. Restore latest backup
# 3. Verify data integrity
```

---

## 📊 Monitoring

### Key Metrics to Track

**Application Health**
- Response time (p50, p95, p99)
- Error rate (%)
- Request rate (req/s)

**Database**
- Connection pool usage
- Query duration
- Database size

**Infrastructure**
- CPU usage (%)
- Memory usage (%)
- Disk usage (%)

**Business Metrics**
- Active users
- AI requests per day
- API key usage

---

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 80% | > 95% |
| Disk Usage | > 80% | > 90% |
| Error Rate | > 1% | > 5% |
| Response Time | > 1s | > 5s |

---

## 🔐 Access Control

### Who Has Access

**Production Database:**
- DBA: Full access
- Senior Developers: Read-only access
- Others: No direct access (use application)

**Production Server:**
- DevOps: SSH access
- Others: No direct access

**Environment Variables:**
- Stored in: AWS Secrets Manager / HashiCorp Vault
- Who can view: Tech Lead, DevOps
- Who can edit: Tech Lead only

---

### How to Grant Access

**Database (Read-Only):**
```sql
CREATE USER analyst WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE stockmind TO analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analyst;
```

**Server (SSH):**
```bash
# Add public key to authorized_keys
echo "ssh-rsa AAAA..." >> ~/.ssh/authorized_keys
```

---

## 📞 Escalation

### Who to Contact

**Application Issues:**
- On-call Developer: @john (Slack)
- Backup: @sarah (Slack)

**Database Issues:**
- DBA: @mike (Slack)
- Escalate to: CTO

**Infrastructure Issues:**
- DevOps: @alex (Slack)
- Escalate to: Cloud Provider Support

---

## 📚 Additional Resources

- [Deployment Guide](./LOCAL_SETUP.md)
- [Production Readiness Review](./PRODUCTION_READINESS_REVIEW.md)
- [Test Coverage Report](./TEST_AND_LOGGING_COVERAGE_REPORT.md)
- [Authentication Verification](./AUTH_VERIFICATION_REPORT.md)

---

**Last Updated:** 2025-11-24
**Maintainer:** DevOps Team
