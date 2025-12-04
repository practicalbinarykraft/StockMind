# Independent Deployment Guide

This guide explains how to deploy StockMind on **any server** (DigitalOcean, AWS, your own VPS, etc.) **without any Replit dependencies**.

## ✅ What Was Removed

All Replit-specific dependencies have been removed:
- ❌ Replit Auth → ✅ JWT Authentication
- ❌ Hardcoded repl.co domains → ✅ Configurable CORS
- ❌ REPL_SLUG/REPL_OWNER env vars → ✅ BASE_URL env var
- ❌ Replit-specific session storage → ✅ Standard PostgreSQL sessions

## 🔧 Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ database
- **Domain name** (optional but recommended)
- **SSL certificate** (Let's Encrypt recommended for HTTPS)

## 📦 Step 1: Clone and Setup

```bash
# Clone your repository
git clone https://github.com/yourusername/StockMind.git
cd StockMind

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## 🔐 Step 2: Configure Environment Variables

Edit `.env` file with your configuration:

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/stockmind

# Authentication (CRITICAL!)
# Generate secure secrets:
openssl rand -base64 32  # Use this output for SESSION_SECRET
openssl rand -base64 32  # Use this output for JWT_SECRET

SESSION_SECRET=<your-generated-secret-1>
JWT_SECRET=<your-generated-secret-2>

# Application
NODE_ENV=production
PORT=5000
BASE_URL=https://yourdomain.com

# CORS (your frontend domains)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Optional Variables

```bash
# Error monitoring (recommended for production)
SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# Instagram Business features (if you need them)
FB_APP_ID=your-fb-app-id
FB_APP_SECRET=your-fb-app-secret

# Release tracking
APP_VERSION=1.0.0
```

## 🗄️ Step 3: Setup Database

```bash
# Create PostgreSQL database
createdb stockmind

# Or using psql:
psql -U postgres
CREATE DATABASE stockmind;
\q

# Apply schema migrations
npm run db:push

# Verify database connection
psql $DATABASE_URL -c "SELECT 1"
```

## 🏗️ Step 4: Build Application

```bash
# Build frontend and backend
npm run build

# Output:
# - Frontend: dist/public/
# - Backend: dist/server.js
```

## 👤 Step 5: Create First User

**IMPORTANT:** With JWT auth, you need to register via API:

```bash
# Start the server (in background or separate terminal)
npm start &

# Register first user via API
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "YourSecurePassword123!",
    "firstName": "Admin",
    "lastName": "User"
  }'

# Response will include JWT token:
# {
#   "message": "Registration successful",
#   "token": "eyJhbGciOiJIUzI1NiIs...",
#   "user": { "id": "...", "email": "..." }
# }

# Save this token - you'll need it to login to the frontend!
```

## 🚀 Step 6: Deploy with PM2 (Recommended)

PM2 keeps your app running and handles restarts:

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start npm --name "stockmind" -- start

# Configure PM2 to start on boot
pm2 startup
pm2 save

# Monitor logs
pm2 logs stockmind

# Other useful commands:
pm2 restart stockmind  # Restart app
pm2 stop stockmind     # Stop app
pm2 status             # Check status
```

## 🌐 Step 7: Configure Reverse Proxy (Nginx)

### Install Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configure Nginx

Create `/etc/nginx/sites-available/stockmind`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (after Let's Encrypt setup)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # File upload limit
    client_max_body_size 50M;
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/stockmind /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Step 8: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically:
# 1. Verify domain ownership
# 2. Generate SSL certificates
# 3. Update Nginx config
# 4. Setup auto-renewal

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🔥 Step 9: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Check status
sudo ufw status
```

## 📊 Step 10: Health Checks

Test your deployment:

```bash
# 1. Basic health check
curl https://yourdomain.com/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2025-11-23T...",
#   "uptime": 123,
#   "environment": "production"
# }

# 2. Detailed health check
curl https://yourdomain.com/api/health

# 3. Test authentication
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "YourSecurePassword123!"
  }'
```

## 🎉 Step 11: Access Your Application

1. Open browser: `https://yourdomain.com`
2. Login with your registered credentials
3. Setup API keys in Settings
4. Start using StockMind!

---

## 🔧 Maintenance & Operations

### View Logs

```bash
# Application logs (PM2)
pm2 logs stockmind

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

### Update Application

```bash
# Pull latest changes
cd /path/to/StockMind
git pull origin main

# Install dependencies (if needed)
npm install

# Apply database migrations (if any)
npm run db:push

# Rebuild application
npm run build

# Restart with zero downtime
pm2 reload stockmind
```

### Backup Database

```bash
# Create backup
pg_dump $DATABASE_URL > stockmind_backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < stockmind_backup_20251123.sql
```

### Monitor Resource Usage

```bash
# Check server resources
htop

# Check disk space
df -h

# Check memory
free -h

# Check PM2 process
pm2 monit
```

---

## 🐛 Troubleshooting

### App won't start

```bash
# Check logs
pm2 logs stockmind --lines 100

# Common issues:
# - DATABASE_URL not set or wrong
# - SESSION_SECRET not set
# - Port 5000 already in use
# - Node.js version too old
```

### Database connection errors

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL service
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 502 Bad Gateway (Nginx)

```bash
# Check if app is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart stockmind
sudo systemctl restart nginx
```

### CORS errors in browser

```bash
# Verify ALLOWED_ORIGINS in .env
# Must include your frontend domain

# Example:
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Restart after changes
pm2 restart stockmind
```

---

## 📈 Performance Optimization

### Enable Gzip Compression (Nginx)

Add to Nginx config:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
```

### Setup Redis for Sessions (Optional)

For high-traffic production:

```bash
# Install Redis
sudo apt install redis-server

# Update SESSION_SECRET in .env to use Redis
# (requires code changes to use connect-redis)
```

### Database Optimization

```bash
# Create indexes for better performance
psql $DATABASE_URL <<EOF
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_user_id ON ig_accounts(user_id);
EOF
```

---

## ✅ Production Readiness Checklist

- [ ] DATABASE_URL configured and tested
- [ ] SESSION_SECRET and JWT_SECRET generated (strong, 32+ characters)
- [ ] BASE_URL set to your domain
- [ ] ALLOWED_ORIGINS configured for CORS
- [ ] SSL certificate installed (HTTPS)
- [ ] Firewall configured (UFW)
- [ ] PM2 running and configured to start on boot
- [ ] Nginx reverse proxy configured
- [ ] First user registered via API
- [ ] Health checks passing (/health, /api/health)
- [ ] Database backups scheduled
- [ ] Monitoring configured (Sentry optional)
- [ ] Logs accessible (PM2 + Nginx)

---

## 🆘 Support

If you encounter issues:

1. Check logs: `pm2 logs stockmind`
2. Verify health endpoint: `curl http://localhost:5000/health`
3. Review environment variables: `.env` file
4. Check database connection: `psql $DATABASE_URL`
5. Consult documentation: `PRODUCTION_HARDENING_COMPLETE.md`

---

## 📝 Next Steps

After successful deployment:

1. **Setup monitoring** - Configure Sentry for error tracking
2. **Configure backups** - Schedule daily database backups
3. **Setup CI/CD** - Automate deployments with GitHub Actions
4. **Scale horizontally** - Add load balancer for multiple instances
5. **Add Redis** - For better session management and caching

Your StockMind instance is now **100% independent** and can run on any server! 🚀
