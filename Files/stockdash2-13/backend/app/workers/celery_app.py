from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "stockdash",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.workers.tasks.stock_tasks",
        "app.workers.tasks.sentiment_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# ─── Beat Schedule ────────────────────────────────────────────────────────────

celery_app.conf.beat_schedule = {
    # Warm quote cache for top 30 tickers every 30 seconds
    "warm-quote-cache": {
        "task": "app.workers.tasks.stock_tasks.warm_quote_cache",
        "schedule": 30.0,
    },
    # Refresh stock metadata (sector, market cap) nightly at 2am UTC
    "refresh-stock-metadata": {
        "task": "app.workers.tasks.stock_tasks.refresh_stock_metadata",
        "schedule": crontab(hour=2, minute=0),
    },
    # Ingest Reddit posts every 15 minutes
    "ingest-reddit": {
        "task": "app.workers.tasks.sentiment_tasks.ingest_reddit_posts",
        "schedule": crontab(minute="*/15"),
    },
    # Ingest StockTwits every 30 minutes
    "ingest-stocktwits": {
        "task": "app.workers.tasks.sentiment_tasks.ingest_stocktwits",
        "schedule": crontab(minute="*/30"),
    },
    # Recompute sentiment scores every hour
    "compute-sentiment": {
        "task": "app.workers.tasks.sentiment_tasks.compute_sentiment_scores",
        "schedule": crontab(minute=0),
    },
}
