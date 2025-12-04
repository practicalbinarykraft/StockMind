#!/bin/sh
# Docker Entrypoint Script
# Runs database migrations before starting the application

set -e

echo "========================================="
echo "StockMind Production Startup"
echo "========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is required"
  exit 1
fi

echo "✓ Environment variables validated"
echo ""

# Run database migrations
echo "Running database migrations..."
echo "Using migration runner: dist/db/migrate.js"
echo ""

if node dist/db/migrate.js; then
  echo ""
  echo "✅ Database migrations completed successfully"
  echo ""
else
  echo ""
  echo "❌ Database migration failed!"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check DATABASE_URL is correct"
  echo "2. Ensure database is running and accessible"
  echo "3. Verify database user has required permissions"
  echo "4. Check application logs for detailed error"
  echo ""
  exit 1
fi

echo "========================================="
echo "Starting StockMind Application"
echo "========================================="
echo ""

# Start the application
exec "$@"
