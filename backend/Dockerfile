# ─────────────────────────────────────────────────────────────────────────────
# StockDash Backend Dockerfile
#
# Build context: backend/  (rootDir: backend in render.yaml)
# All COPY paths are relative to backend/.
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

WORKDIR /code

ENV PYTHONPATH=/code \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       gcc \
       libpq-dev \
       curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps (cached layer — only rebuilds when requirements.txt changes)
COPY requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

# Copy application source
COPY . .

# Make entrypoint executable (used by startCommand in render.yaml)
RUN chmod +x entrypoint.sh

EXPOSE 8000

# NOTE: No ENTRYPOINT here — Render's startCommand provides the full command.
# The entrypoint.sh script is called explicitly in startCommand.
# Default CMD is for local docker-compose only.
CMD ["./entrypoint.sh", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
