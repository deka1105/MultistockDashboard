#!/bin/bash
set -e

# Only run DB migrations when starting the API server, not workers
SHOULD_MIGRATE=false
for arg in "$@"; do
  if [[ "$arg" == *"uvicorn"* ]]; then
    SHOULD_MIGRATE=true
    break
  fi
done

if [ "$SHOULD_MIGRATE" = true ]; then
  echo "⏳ Waiting for database..."
  until python -c "
import asyncio, asyncpg, os
async def check():
    url = os.environ.get('DATABASE_URL','').replace('+asyncpg','')
    conn = await asyncpg.connect(url)
    await conn.close()
asyncio.run(check())
" 2>/dev/null; do
    echo "  DB not ready — retrying in 2s..."
    sleep 2
  done
  echo "✅ Database is up"

  echo "⏳ Running Alembic migrations..."
  alembic upgrade head
  echo "✅ Migrations complete"
else
  # Workers: just wait for DB to be reachable before starting
  echo "⏳ Waiting for database (worker mode)..."
  until python -c "
import asyncio, asyncpg, os
async def check():
    url = os.environ.get('DATABASE_URL','').replace('+asyncpg','')
    conn = await asyncpg.connect(url)
    await conn.close()
asyncio.run(check())
" 2>/dev/null; do
    echo "  DB not ready — retrying in 2s..."
    sleep 2
  done
  echo "✅ Database is up"
fi

echo "🚀 Starting $@"
# Trap SIGTERM for graceful shutdown
trap "exit 0" SIGTERM
exec "$@"
