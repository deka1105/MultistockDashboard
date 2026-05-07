from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",   # ignore POSTGRES_USER etc. used by docker-compose but not needed in app
    )

    # App
    app_env: str = "development"
    secret_key: str = "change_me"
    debug: bool = True
    app_name: str = "StockDash API"
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+asyncpg://stockdash:stockdash_dev@db:5432/stockdash"

    # Redis
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/1"
    celery_result_backend: str = "redis://redis:6379/2"

    # Finnhub
    finnhub_api_key: str = ""
    finnhub_base_url: str = "https://finnhub.io/api/v1"
    finnhub_ws_url: str = "wss://ws.finnhub.io"

    # Reddit
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "stockdash/1.0"

    # Twitter / X
    twitter_bearer_token: str = ""

    # Cache TTLs (seconds)
    cache_ttl_quote: int = 30
    cache_ttl_candles: int = 300
    cache_ttl_news: int = 180
    cache_ttl_market_overview: int = 60

    # Rate limiting
    rate_limit_default: str = "60/minute"
    rate_limit_auth: str = "10/minute"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
