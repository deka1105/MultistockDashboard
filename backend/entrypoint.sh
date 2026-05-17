#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# StockDash entrypoint — handles migrations + process start
#
# Called by Render's startCommand and by docker-compose CMD.
# Usage: ./entrypoint.sh <command> [args...]
#   ./entrypoint.sh uvicorn app.main:app --host 0.0.0.0 --port $PORT
#   ./entrypoint.sh celery -A app.workers.celery_app worker
#   ./entrypoint.sh celery -A app.workers.celery_app beat
# ─────────────────────────────────────────────────────────────────────────────
set -e

# Graceful shutdown on SIGTERM (Render zero-downtime deploys)
trap 'echo "SIGTERM received — shutting down"; kill $PID 2>/dev/null; exit 0' SIGTERM SIGINT

# ── Alembic migrations (only for the API server, not workers) ───────────────
if [[ "$1" == "uvicorn" ]]; then
    echo "🔄 Running database migrations..."
    RETRIES=0
    until alembic upgrade head; do
        RETRIES=$((RETRIES+1))
        if [ "$RETRIES" -ge 10 ]; then
            echo "❌ Migrations failed after 10 attempts. Check DATABASE_URL."
            exit 1
        fi
        echo "   Attempt $RETRIES failed — retrying in 5s..."
        sleep 5
    done
    echo "✅ Migrations complete"
fi

# ── Start process ────────────────────────────────────────────────────────────
echo "🚀 Starting: $*"
exec "$@"
