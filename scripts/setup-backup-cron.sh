#!/bin/bash
#
# Setup Automated Database Backups (Cron)
# Configures daily backups at 2 AM server time
#
# Usage:
#   sudo ./scripts/setup-backup-cron.sh
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"
CRON_USER="${SUDO_USER:-$(whoami)}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
  echo -e "${RED}❌ ERROR: $1${NC}"
}

echo "╔════════════════════════════════════════════════════════╗"
echo "║         Setup Automated Database Backups              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  error "Please run as root (sudo)"
  exit 1
fi

# Verify backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
  error "Backup script not found: $BACKUP_SCRIPT"
  exit 1
fi

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"
success "Backup script is executable"

# Create environment file for cron
ENV_FILE="$PROJECT_ROOT/.env.backup"

echo "Creating backup environment file..."
cat > "$ENV_FILE" << 'EOF'
# Database Backup Environment Variables
# This file is sourced by the backup cron job
#
# ⚠️  SECURITY: Ensure this file has restricted permissions (600)

# Database connection string
# Replace with your actual DATABASE_URL
DATABASE_URL=postgresql://user:password@localhost:5432/stockmind

# Backup retention in days (default: 30)
BACKUP_RETENTION_DAYS=30

# Backup directory (default: ./backups)
# BACKUP_DIR=/path/to/backups
EOF

chmod 600 "$ENV_FILE"
chown "$CRON_USER:$CRON_USER" "$ENV_FILE"

warn "Created $ENV_FILE"
warn "⚠️  IMPORTANT: Edit this file and set your DATABASE_URL!"
echo ""

# Create cron job
CRON_SCHEDULE="0 2 * * *"  # Daily at 2 AM
CRON_JOB="$CRON_SCHEDULE cd $PROJECT_ROOT && source $ENV_FILE && $BACKUP_SCRIPT >> $PROJECT_ROOT/backups/backup-cron.log 2>&1"

echo "Creating cron job for user: $CRON_USER"
echo "Schedule: Daily at 2:00 AM"
echo ""

# Check if cron job already exists
if crontab -u "$CRON_USER" -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
  warn "Cron job already exists, updating..."
  (crontab -u "$CRON_USER" -l 2>/dev/null | grep -v "$BACKUP_SCRIPT"; echo "$CRON_JOB") | crontab -u "$CRON_USER" -
else
  (crontab -u "$CRON_USER" -l 2>/dev/null; echo "$CRON_JOB") | crontab -u "$CRON_USER" -
fi

success "Cron job installed successfully!"
echo ""

# Create backups directory
mkdir -p "$PROJECT_ROOT/backups"
chown "$CRON_USER:$CRON_USER" "$PROJECT_ROOT/backups"
success "Backups directory created: $PROJECT_ROOT/backups"
echo ""

# Display current cron jobs
echo "Current cron jobs for $CRON_USER:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
crontab -u "$CRON_USER" -l | grep "$BACKUP_SCRIPT" || echo "(no backup jobs)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Instructions
echo "╔════════════════════════════════════════════════════════╗"
echo "║                Setup Complete!                         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1. Edit the environment file:"
echo "   nano $ENV_FILE"
echo ""
echo "2. Set your DATABASE_URL:"
echo "   DATABASE_URL=postgresql://user:password@host:port/database"
echo ""
echo "3. Test the backup manually:"
echo "   sudo -u $CRON_USER bash -c 'source $ENV_FILE && $BACKUP_SCRIPT'"
echo ""
echo "4. Backups will run automatically every day at 2:00 AM"
echo ""
echo "5. View backup logs:"
echo "   tail -f $PROJECT_ROOT/backups/backup.log"
echo "   tail -f $PROJECT_ROOT/backups/backup-cron.log"
echo ""
echo "6. List backups:"
echo "   ls -lh $PROJECT_ROOT/backups/"
echo ""
echo "To modify backup schedule:"
echo "  crontab -e -u $CRON_USER"
echo ""
success "Setup complete!"
