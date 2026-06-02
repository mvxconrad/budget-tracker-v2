"""AI usage tiers + Stripe billing: users.tier, ai_messages_used,
ai_usage_reset_at, stripe_customer_id

Revision ID: 0003_ai_tiers_billing
Revises: 0002_email_verification
Create Date: 2026-06-02
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_ai_tiers_billing"
down_revision: Union[str, None] = "0002_email_verification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("tier", sa.String(length=16), nullable=False, server_default="free"),
    )
    op.add_column(
        "users",
        sa.Column("ai_messages_used", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "users",
        sa.Column(
            "ai_usage_reset_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.add_column(
        "users",
        sa.Column("stripe_customer_id", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_users_stripe_customer_id", "users", ["stripe_customer_id"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_column("users", "stripe_customer_id")
    op.drop_column("users", "ai_usage_reset_at")
    op.drop_column("users", "ai_messages_used")
    op.drop_column("users", "tier")
