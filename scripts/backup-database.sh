#!/bin/bash
#
# Database Backup Script
# Creates timestamped PostgreSQL backups with automatic retention
#
# Usage:
#   ./scripts/backup-database.sh                  # Backup to default location
#   ./scripts/backup-database.sh /custom/path     # Custom backup directory
#   DATABASE_URL="postgresql://..." ./scripts/backup-database.sh  # Custom DB URL
#
# Environment Variables:
#   DATABASE_URL - PostgreSQL connection string (required)
#   BACKUP_RETENTION_DAYS - Number of days to keep backups (default: 30)
#

set -e  # Exit on error

# Configuration
BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/stockmind_backup_${TIMESTAMP}.sql"
BACKUP_FILE_COMPRESSED="${BACKUP_FILE}.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}❌ ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

success() {
  echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
  echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
  # Check if pg_dump is installed
  if ! command -v pg_dump &> /dev/null; then
    error "pg_dump not found. Install PostgreSQL client tools."
    exit 1
  fi

  # Check DATABASE_URL
  if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL environment variable is required"
    echo "Usage: DATABASE_URL=postgresql://user:pass@host:port/db ./scripts/backup-database.sh"
    exit 1
  fi

  # Create backup directory if it doesn't exist
  mkdir -p "$BACKUP_DIR"
  if [ $? -ne 0 ]; then
    error "Failed to create backup directory: $BACKUP_DIR"
    exit 1
  fi
}

# Parse DATABASE_URL
parse_database_url() {
  # Extract database name from URL for display
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
  if [ -z "$DB_NAME" ]; then
    DB_NAME="unknown"
  fi
}

# Create backup
create_backup() {
  log "Starting backup of database: $DB_NAME"
  log "Backup file: $BACKUP_FILE_COMPRESSED"

  # Run pg_dump and compress on the fly
  # --no-password: Don't prompt for password (use URL)
  # --clean: Add DROP statements before CREATE
  # --if-exists: Use IF EXISTS in DROP statements
  # --verbose: Show progress
  if pg_dump "$DATABASE_URL" \
    --no-password \
    --clean \
    --if-exists \
    --create \
    --verbose \
    2>> "$LOG_FILE" | gzip > "$BACKUP_FILE_COMPRESSED"; then

    BACKUP_SIZE=$(du -h "$BACKUP_FILE_COMPRESSED" | cut -f1)
    success "Backup created successfully ($BACKUP_SIZE)"
    return 0
  else
    error "Backup failed!"
    rm -f "$BACKUP_FILE_COMPRESSED"  # Remove incomplete backup
    return 1
  fi
}

# Verify backup integrity
verify_backup() {
  log "Verifying backup integrity..."

  if gzip -t "$BACKUP_FILE_COMPRESSED" 2>> "$LOG_FILE"; then
    success "Backup integrity verified"
    return 0
  else
    error "Backup file is corrupted!"
    return 1
  fi
}

# Cleanup old backups
cleanup_old_backups() {
  log "Cleaning up backups older than $RETENTION_DAYS days..."

  DELETED_COUNT=0

  # Find and delete old backup files
  while IFS= read -r old_backup; do
    log "Deleting old backup: $(basename "$old_backup")"
    rm -f "$old_backup"
    ((DELETED_COUNT++))
  done < <(find "$BACKUP_DIR" -name "stockmind_backup_*.sql.gz" -type f -mtime +"$RETENTION_DAYS")

  if [ $DELETED_COUNT -gt 0 ]; then
    success "Deleted $DELETED_COUNT old backup(s)"
  else
    log "No old backups to delete"
  fi
}

# List recent backups
list_backups() {
  log "Recent backups:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  BACKUP_COUNT=0
  TOTAL_SIZE=0

  while IFS= read -r backup; do
    if [ -f "$backup" ]; then
      SIZE=$(du -h "$backup" | cut -f1)
      DATE=$(stat -c %y "$backup" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1 || stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup" 2>/dev/null)
      echo "  $(basename "$backup") - $SIZE - $DATE"
      ((BACKUP_COUNT++))

      # Calculate total size (in KB)
      SIZE_KB=$(du -k "$backup" | cut -f1)
      TOTAL_SIZE=$((TOTAL_SIZE + SIZE_KB))
    fi
  done < <(find "$BACKUP_DIR" -name "stockmind_backup_*.sql.gz" -type f | sort -r | head -10)

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ $BACKUP_COUNT -gt 0 ]; then
    TOTAL_SIZE_MB=$((TOTAL_SIZE / 1024))
    log "Total backups: $BACKUP_COUNT (${TOTAL_SIZE_MB}MB)"
  else
    warn "No backups found in $BACKUP_DIR"
  fi
}

# Main backup process
main() {
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║         StockMind Database Backup Script              ║"
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""

  check_prerequisites
  parse_database_url

  log "Backup configuration:"
  log "  Database: $DB_NAME"
  log "  Backup directory: $BACKUP_DIR"
  log "  Retention: $RETENTION_DAYS days"
  log "  Timestamp: $TIMESTAMP"
  echo ""

  # Create backup
  if ! create_backup; then
    error "Backup process failed!"
    exit 1
  fi

  echo ""

  # Verify backup
  if ! verify_backup; then
    error "Backup verification failed!"
    exit 1
  fi

  echo ""

  # Cleanup old backups
  cleanup_old_backups

  echo ""

  # List backups
  list_backups

  echo ""
  success "Backup process completed successfully!"
  echo ""
  echo "To restore this backup:"
  echo "  gunzip -c $BACKUP_FILE_COMPRESSED | psql \$DATABASE_URL"
  echo ""
}

# Run main function
main "$@"
