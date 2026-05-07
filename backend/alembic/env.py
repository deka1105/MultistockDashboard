"""
Alembic migration environment.

IMPORTANT: This file reads DATABASE_URL directly from os.environ —
NOT from pydantic-settings or any .env file.
This ensures Render's injected DATABASE_URL is always used in production.
"""
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Import all models so Alembic can auto-detect schema changes
from app.models.models import Base  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _get_sync_db_url() -> str:
    """
    Build a psycopg2 (synchronous) connection URL for Alembic.

    Priority:
      1. DATABASE_URL env var (Render injects this automatically)
      2. Fallback to alembic.ini sqlalchemy.url (for local dev only)

    URL normalisation:
      postgresql://...        → postgresql+psycopg2://...   (Render format)
      postgresql+asyncpg://...→ postgresql+psycopg2://...   (app runtime format)
      postgres://...          → postgresql+psycopg2://...   (legacy Heroku format)
    """
    url = os.environ.get("DATABASE_URL", "").strip()

    if not url:
        # Fall back to alembic.ini (local docker-compose only)
        url = config.get_main_option("sqlalchemy.url") or ""

    if not url:
        raise ValueError(
            "DATABASE_URL is not set. "
            "Set it in your environment or in alembic.ini for local dev."
        )

    # Normalise scheme → synchronous psycopg2 driver
    url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    url = url.replace("postgres+asyncpg://",   "postgresql+psycopg2://")
    url = url.replace("postgres://",           "postgresql+psycopg2://")

    # If it's just postgresql:// (no driver suffix), add psycopg2
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

    return url


# Override alembic.ini URL with the normalised runtime URL
_sync_url = _get_sync_db_url()
config.set_main_option("sqlalchemy.url", _sync_url)


def run_migrations_offline() -> None:
    """Generate SQL script without a live DB connection."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
