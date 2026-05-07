#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# StockDash Backend Entrypoint
#
# Handles:
#   1. Alembic migrations (only when running the API server, not workers)
#   2. Graceful SIGTERM handling for Render zero-downtime deploys
#   3. Fallback if DATABASE_URL is not yet available
# ─────────────────────────────────────────────────────────────────────────────
set -e

trap "echo 'Received SIGTERM — shutting down gracefully'; exit 0" SIGTERM SIGINT

# Only run migrations when starting the API server (first arg contains "uvicorn")
# Celery workers and beat schedulers skip this to avoid race conditions.
if echo "$*" | grep -q "uvicorn"; then
    echo "🔄 Running Alembic database migrations..."

    # Retry up to 10 times in case the DB isn't ready yet (cold start)
    MAX_RETRIES=10
    RETRY_COUNT=0
    until alembic upgrade head; do
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
            echo "❌ Migration failed after $MAX_RETRIES attempts — exiting"
            exit 1
        fi
        echo "⏳ Migration attempt $RETRY_COUNT failed — retrying in 5s..."
        sleep 5
    done
    echo "✅ Migrations complete"
fi

echo "🚀 Starting: $*"
exec "$@"
