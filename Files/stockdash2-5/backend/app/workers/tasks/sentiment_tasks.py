import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

# Tickers to track for sentiment (can be driven by DB watchlists in Phase 4)
SENTIMENT_TICKERS = [
    "AAPL", "TSLA", "NVDA", "AMZN", "META", "MSFT",
    "GME", "AMC", "PLTR", "SOFI", "RIVN",  # WSB favorites
]

SUBREDDITS = ["wallstreetbets", "stocks", "investing", "options"]


@celery_app.task(name="app.workers.tasks.sentiment_tasks.ingest_reddit_posts", bind=True, max_retries=3)
def ingest_reddit_posts(self):
    """
    Pull recent Reddit posts/comments mentioning tracked tickers.
    Stores raw text in social_posts table for NLP processing.
    Runs every 15 minutes via Celery beat.
    Full implementation in Phase 4.
    """
    logger.info("Reddit ingestion task triggered (stub — full impl in Phase 4)")
    return {"status": "stub", "phase": 4}


@celery_app.task(name="app.workers.tasks.sentiment_tasks.ingest_stocktwits", bind=True, max_retries=3)
def ingest_stocktwits(self):
    """
    Pull StockTwits stream for each tracked ticker.
    StockTwits posts include user-tagged bullish/bearish labels (no NLP required).
    Runs every 30 minutes via Celery beat.
    Full implementation in Phase 4.
    """
    logger.info("StockTwits ingestion task triggered (stub — full impl in Phase 4)")
    return {"status": "stub", "phase": 4}


@celery_app.task(name="app.workers.tasks.sentiment_tasks.compute_sentiment_scores", bind=True)
def compute_sentiment_scores(self):
    """
    Aggregate raw social_posts into sentiment_scores per ticker per time window.
    Runs FinBERT inference on unprocessed posts.
    Full implementation in Phase 4.
    """
    logger.info("Sentiment compute task triggered (stub — full impl in Phase 4)")
    return {"status": "stub", "phase": 4}
