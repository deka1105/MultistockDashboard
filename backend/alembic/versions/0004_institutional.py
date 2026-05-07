"""Add institutional_ownership table

Revision ID: 0004
Revises: 0003
Create Date: 2025-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'institutional_ownership',
        sa.Column('id',              sa.Integer(),     primary_key=True, autoincrement=True),
        sa.Column('ticker',          sa.String(16),    nullable=False),
        sa.Column('report_date',     sa.String(10),    nullable=False),
        sa.Column('inst_pct_float',  sa.Float(),       nullable=True),
        sa.Column('num_holders',     sa.Integer(),     nullable=True),
        sa.Column('qoq_change_pct',  sa.Float(),       nullable=True),
        sa.Column('top_holder_name', sa.String(256),   nullable=True),
        sa.Column('top_holder_pct',  sa.Float(),       nullable=True),
        sa.Column('raw_json',        sa.Text(),        nullable=True),
        sa.Column('created_at',      sa.DateTime(timezone=True),
                  server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_institutional_ownership_ticker', 'institutional_ownership', ['ticker'])


def downgrade() -> None:
    op.drop_index('ix_institutional_ownership_ticker', table_name='institutional_ownership')
    op.drop_table('institutional_ownership')
