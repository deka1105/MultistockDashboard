"""Initial schema — users, watchlists, stock_metadata, social_posts, sentiment_scores

Revision ID: 0001_initial
Revises: 
Create Date: 2026-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("plan", sa.String(20), nullable=False, server_default="free"),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_id", "users", ["id"])

    # ── watchlists ─────────────────────────────────────────────────────────
    op.create_table(
        "watchlists",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_watchlists_id", "watchlists", ["id"])

    # ── watchlist_items ────────────────────────────────────────────────────
    op.create_table(
        "watchlist_items",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("watchlist_id", sa.Integer(), sa.ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_watchlist_items_id", "watchlist_items", ["id"])
    op.create_index("ix_watchlist_items_ticker", "watchlist_items", ["ticker"])

    # ── stock_metadata ─────────────────────────────────────────────────────
    op.create_table(
        "stock_metadata",
        sa.Column("ticker", sa.String(10), primary_key=True, nullable=False),
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column("sector", sa.String(100), nullable=True),
        sa.Column("industry", sa.String(100), nullable=True),
        sa.Column("market_cap", sa.Float(), nullable=True),
        sa.Column("logo_url", sa.String(512), nullable=True),
        sa.Column("exchange", sa.String(50), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_stock_metadata_ticker", "stock_metadata", ["ticker"])

    # ── social_posts ───────────────────────────────────────────────────────
    op.create_table(
        "social_posts",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("external_id", sa.String(255), nullable=False),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("author", sa.String(255), nullable=True),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("url", sa.String(512), nullable=True),
        sa.Column("raw_sentiment", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_social_posts_id", "social_posts", ["id"])
    op.create_index("ix_social_posts_ticker", "social_posts", ["ticker"])
    op.create_index("ix_social_posts_external_id", "social_posts", ["external_id"], unique=True)

    # ── sentiment_scores ───────────────────────────────────────────────────
    op.create_table(
        "sentiment_scores",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("ticker", sa.String(10), nullable=False),
        sa.Column("source", sa.String(20), nullable=True),
        sa.Column("label", sa.String(20), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("post_volume", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("window_hours", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_sentiment_scores_id", "sentiment_scores", ["id"])
    op.create_index("ix_sentiment_scores_ticker", "sentiment_scores", ["ticker"])


def downgrade() -> None:
    op.drop_table("sentiment_scores")
    op.drop_table("social_posts")
    op.drop_table("stock_metadata")
    op.drop_table("watchlist_items")
    op.drop_table("watchlists")
    op.drop_table("users")
