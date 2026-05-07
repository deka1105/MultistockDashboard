# ─────────────────────────────────────────────────────────────────────────────
# StockDash Backend — Dockerfile
#
# Build context: backend/  (rootDir: backend in render.yaml)
# So all COPY paths are relative to the backend/ directory.
#
# Local build (from repo root):
#   docker build -t stockdash-api -f backend/Dockerfile backend/
#
# Render builds this automatically via render.yaml (rootDir: backend).
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

# WORKDIR /code — Python package 'app' must be importable as app.*
# so /code must be on PYTHONPATH (its parent directory contains app/).
WORKDIR /code

ENV PYTHONPATH=/code \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System dependencies
# libpq-dev: PostgreSQL client for asyncpg
# gcc: needed to compile some Python C extensions
# curl: used in health checks
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       gcc \
       libpq-dev \
       curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (Docker layer caching)
# This layer only rebuilds when requirements.txt changes
COPY requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

# Copy application source
COPY . .

# Ensure entrypoint is executable
RUN chmod +x entrypoint.sh

# Expose for local development (Render uses $PORT env var)
EXPOSE 8000

# Health check for Render (also works with docker-compose)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
