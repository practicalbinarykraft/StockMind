#!/bin/bash
#
# Deploy to Staging Environment
# Safely deploys latest code to staging with automated tests
#
# Usage:
#   ./scripts/deploy-staging.sh
#   ./scripts/deploy-staging.sh --skip-tests  # Skip smoke tests
#

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.staging.yml"
ENV_FILE=".env.staging"
SKIP_TESTS=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
  esac
done

log() {
  echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
  echo -e "${RED}❌ ERROR: $1${NC}"
}

# Header
echo "╔════════════════════════════════════════════════════════╗"
echo "║         StockMind Staging Deployment                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
log "Checking prerequisites..."

if [ ! -f "$COMPOSE_FILE" ]; then
  error "Docker compose file not found: $COMPOSE_FILE"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  error "Environment file not found: $ENV_FILE"
  echo "Create it from template: cp .env.staging.example $ENV_FILE"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  error "Docker not installed"
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  error "docker-compose not installed"
  exit 1
fi

success "Prerequisites check passed"
echo ""

# Get current git info
log "Getting deployment info..."
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_DIRTY=$(git diff --quiet 2>/dev/null || echo " (dirty)")

log "Branch: $GIT_BRANCH"
log "Commit: $GIT_COMMIT$GIT_DIRTY"
echo ""

# Confirm deployment
if [ "$GIT_BRANCH" != "main" ] && [ "$GIT_BRANCH" != "claude/review-junior-friendly-code-01VyHxkYAMb6s1Y1t3dk91NQ" ]; then
  warn "Deploying from non-main branch: $GIT_BRANCH"
  read -p "Continue? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
  fi
  echo ""
fi

# Backup current database (if staging already running)
log "Checking for existing staging environment..."
if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
  log "Creating backup before deployment..."

  # Export environment
  export $(cat "$ENV_FILE" | grep -v '^#' | xargs)

  # Backup
  BACKUP_FILE="./backups-staging/pre_deploy_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

  if docker-compose -f "$COMPOSE_FILE" exec -T postgres-staging \
    pg_dump -U stockmind_staging stockmind_staging | gzip > "$BACKUP_FILE" 2>/dev/null; then
    success "Backup created: $BACKUP_FILE"
  else
    warn "Backup failed (continuing anyway)"
  fi
  echo ""
fi

# Pull latest code
log "Pulling latest code..."
if git pull origin "$GIT_BRANCH" 2>/dev/null; then
  success "Code updated"
else
  warn "Git pull failed (continuing with current code)"
fi
echo ""

# Build new image
log "Building Docker image..."
if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache; then
  success "Docker image built"
else
  error "Docker build failed"
  exit 1
fi
echo ""

# Stop old containers
log "Stopping old containers..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
success "Old containers stopped"
echo ""

# Start new containers
log "Starting new containers..."
if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d; then
  success "Containers started"
else
  error "Failed to start containers"
  exit 1
fi
echo ""

# Wait for health check
log "Waiting for application to be ready..."
RETRIES=30
WAIT_TIME=2

for i in $(seq 1 $RETRIES); do
  if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    success "Application is ready!"
    break
  fi

  if [ $i -eq $RETRIES ]; then
    error "Application failed to start (timeout)"
    echo ""
    echo "View logs:"
    echo "  docker-compose -f $COMPOSE_FILE logs -f app-staging"
    exit 1
  fi

  echo -n "."
  sleep $WAIT_TIME
done
echo ""

# Run smoke tests
if [ "$SKIP_TESTS" = false ]; then
  log "Running smoke tests..."
  echo ""

  if ./scripts/smoke-test-staging.sh; then
    success "Smoke tests passed!"
  else
    error "Smoke tests failed!"
    echo ""
    echo "Deployment completed but tests failed. Check logs:"
    echo "  docker-compose -f $COMPOSE_FILE logs -f app-staging"
    exit 1
  fi
  echo ""
fi

# Show deployment info
echo "╔════════════════════════════════════════════════════════╗"
echo "║         Deployment Successful!                         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
log "Staging URL: http://localhost:5001"
log "Health check: http://localhost:5001/health"
log "Git commit: $GIT_COMMIT"
log "Deployed at: $(date)"
echo ""
log "Useful commands:"
echo "  View logs:      docker-compose -f $COMPOSE_FILE logs -f app-staging"
echo "  Stop:           docker-compose -f $COMPOSE_FILE down"
echo "  Restart:        docker-compose -f $COMPOSE_FILE restart app-staging"
echo "  Shell:          docker-compose -f $COMPOSE_FILE exec app-staging sh"
echo "  Database:       docker-compose -f $COMPOSE_FILE exec postgres-staging psql -U stockmind_staging"
echo ""
success "Deployment complete! 🚀"
