"""Add portfolio, positions, and pnl_snapshots tables

Revision ID: 0002_portfolio
Revises: 0001_initial
Create Date: 2026-01-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_portfolio"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "portfolios",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False, server_default="My Portfolio"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_portfolios_id",      "portfolios", ["id"])
    op.create_index("ix_portfolios_user_id", "portfolios", ["user_id"])

    op.create_table(
        "positions",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("portfolio_id", sa.Integer(),
                  sa.ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticker",   sa.String(10), nullable=False),
        sa.Column("shares",   sa.Float(),    nullable=False),
        sa.Column("avg_cost", sa.Float(),    nullable=False),
        sa.Column("notes",    sa.String(500), nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_positions_id",           "positions", ["id"])
    op.create_index("ix_positions_portfolio_id", "positions", ["portfolio_id"])
    op.create_index("ix_positions_ticker",       "positions", ["ticker"])

    op.create_table(
        "pnl_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("portfolio_id", sa.Integer(),
                  sa.ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_date",    sa.DateTime(timezone=True), nullable=False),
        sa.Column("total_value",      sa.Float(), nullable=False),
        sa.Column("total_cost",       sa.Float(), nullable=False),
        sa.Column("daily_return_pct", sa.Float(), nullable=True),
    )
    op.create_index("ix_pnl_snapshots_id",           "pnl_snapshots", ["id"])
    op.create_index("ix_pnl_snapshots_portfolio_id", "pnl_snapshots", ["portfolio_id"])


def downgrade() -> None:
    op.drop_table("pnl_snapshots")
    op.drop_table("positions")
    op.drop_table("portfolios")
