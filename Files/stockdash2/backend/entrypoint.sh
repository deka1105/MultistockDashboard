#!/bin/bash
set -e

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

echo "🚀 Starting $@"
exec "$@"
