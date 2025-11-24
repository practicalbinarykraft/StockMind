#!/bin/bash
#
# Database Restore Script
# Restores PostgreSQL database from backup
#
# Usage:
#   ./scripts/restore-database.sh <backup-file>
#   DATABASE_URL="postgresql://..." ./scripts/restore-database.sh backup.sql.gz
#
# ⚠️  WARNING: This will OVERWRITE the current database!
#

set -e  # Exit on error

# Configuration
BACKUP_FILE="$1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

error() {
  echo -e "${RED}❌ ERROR: $1${NC}"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
  # Check backup file
  if [ -z "$BACKUP_FILE" ]; then
    error "Backup file not specified"
    echo "Usage: $0 <backup-file>"
    echo "Example: $0 ./backups/stockmind_backup_20250124_120000.sql.gz"
    exit 1
  fi

  if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
    exit 1
  fi

  # Check if psql is installed
  if ! command -v psql &> /dev/null; then
    error "psql not found. Install PostgreSQL client tools."
    exit 1
  fi

  # Check DATABASE_URL
  if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL environment variable is required"
    echo "Usage: DATABASE_URL=postgresql://user:pass@host:port/db $0 <backup-file>"
    exit 1
  fi
}

# Parse DATABASE_URL
parse_database_url() {
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
  if [ -z "$DB_NAME" ]; then
    DB_NAME="unknown"
  fi
}

# Confirm restore
confirm_restore() {
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║         StockMind Database Restore Script             ║"
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""
  warn "⚠️  WARNING: This will OVERWRITE the current database!"
  echo ""
  echo "Restore configuration:"
  echo "  Database: $DB_NAME"
  echo "  Backup file: $BACKUP_FILE"
  echo "  Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
  echo "  Backup date: $(stat -c %y "$BACKUP_FILE" 2>/dev/null | cut -d'.' -f1 || stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BACKUP_FILE" 2>/dev/null)"
  echo ""

  # Require explicit confirmation
  read -p "Type 'yes' to continue with restore: " CONFIRMATION

  if [ "$CONFIRMATION" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
  fi

  echo ""
}

# Verify backup integrity
verify_backup() {
  echo "Verifying backup integrity..."

  if [[ "$BACKUP_FILE" == *.gz ]]; then
    if gzip -t "$BACKUP_FILE" 2>/dev/null; then
      success "Backup integrity verified (compressed)"
    else
      error "Backup file is corrupted!"
      exit 1
    fi
  else
    success "Backup file verified (uncompressed)"
  fi

  echo ""
}

# Create backup of current database
backup_current() {
  echo "Creating safety backup of current database..."

  SAFETY_BACKUP="./backups/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
  mkdir -p ./backups

  if pg_dump "$DATABASE_URL" --no-password --clean --if-exists --create 2>/dev/null | gzip > "$SAFETY_BACKUP"; then
    success "Safety backup created: $SAFETY_BACKUP"
  else
    warn "Failed to create safety backup (continuing anyway)"
  fi

  echo ""
}

# Restore database
restore_database() {
  echo "Restoring database from backup..."
  echo "This may take several minutes depending on database size..."
  echo ""

  # Decompress and restore
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    if gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL" --no-password 2>&1 | tail -20; then
      success "Database restored successfully!"
      return 0
    else
      error "Restore failed!"
      return 1
    fi
  else
    if psql "$DATABASE_URL" --no-password < "$BACKUP_FILE" 2>&1 | tail -20; then
      success "Database restored successfully!"
      return 0
    else
      error "Restore failed!"
      return 1
    fi
  fi
}

# Verify restore
verify_restore() {
  echo ""
  echo "Verifying restored database..."

  # Check if database is accessible
  if psql "$DATABASE_URL" --no-password -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    USER_COUNT=$(psql "$DATABASE_URL" --no-password -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
    success "Database verified ($USER_COUNT users found)"
  else
    warn "Could not verify database (table 'users' may not exist)"
  fi

  echo ""
}

# Main restore process
main() {
  check_prerequisites
  parse_database_url
  confirm_restore
  verify_backup
  backup_current

  if ! restore_database; then
    echo ""
    error "Database restore failed!"
    echo ""
    echo "Recovery options:"
    echo "  1. Check the backup file is valid"
    echo "  2. Restore from safety backup: $SAFETY_BACKUP"
    echo "  3. Contact database administrator"
    exit 1
  fi

  verify_restore

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  success "Restore completed successfully!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Next steps:"
  echo "  1. Restart the application"
  echo "  2. Verify application functionality"
  echo "  3. Check logs for any errors"
  echo ""
}

# Run main function
main "$@"
