"""Add alerts and earnings_events tables

Revision ID: 0003_alerts_earnings
Revises: 0002_portfolio
Create Date: 2026-01-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_alerts_earnings"
down_revision = "0002_portfolio"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticker",          sa.String(10),  nullable=False),
        sa.Column("alert_type",      sa.String(30),  nullable=False),
        sa.Column("threshold",       sa.Float(),     nullable=True),
        sa.Column("is_active",       sa.Boolean(),   nullable=False, server_default="true"),
        sa.Column("triggered_at",    sa.DateTime(timezone=True), nullable=True),
        sa.Column("triggered_price", sa.Float(),     nullable=True),
        sa.Column("created_at",      sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_alerts_id",      "alerts", ["id"])
    op.create_index("ix_alerts_ticker",  "alerts", ["ticker"])
    op.create_index("ix_alerts_user_id", "alerts", ["user_id"])

    op.create_table(
        "earnings_events",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("ticker",            sa.String(10),  nullable=False),
        sa.Column("report_date",       sa.DateTime(timezone=True), nullable=False),
        sa.Column("time_of_day",       sa.String(10),  nullable=True),
        sa.Column("eps_estimate",      sa.Float(),     nullable=True),
        sa.Column("eps_actual",        sa.Float(),     nullable=True),
        sa.Column("revenue_estimate",  sa.Float(),     nullable=True),
        sa.Column("revenue_actual",    sa.Float(),     nullable=True),
        sa.Column("surprise_pct",      sa.Float(),     nullable=True),
        sa.Column("beat_miss",         sa.String(10),  nullable=True),
        sa.Column("updated_at",        sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_earnings_events_id",          "earnings_events", ["id"])
    op.create_index("ix_earnings_events_ticker",      "earnings_events", ["ticker"])
    op.create_index("ix_earnings_events_report_date", "earnings_events", ["report_date"])


def downgrade() -> None:
    op.drop_table("earnings_events")
    op.drop_table("alerts")
