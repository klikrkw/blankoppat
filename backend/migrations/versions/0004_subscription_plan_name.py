"""subscription plan_name — kolom denormalisasi nama paket pada subscription

Revision ID: 0004_subscription_plan_name
Revises: 0003_template_content
Create Date: 2026-10-10
"""
import sqlalchemy as sa
from alembic import op

revision = "0004_subscription_plan_name"
down_revision = "0003_template_content"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    try:
        op.add_column("user_subscriptions", sa.Column("plan_name", sa.String(100), nullable=True))
    except Exception:
        pass
    for plan_id, name in bind.execute(sa.text("SELECT id, name FROM subscription_plans")).fetchall():
        bind.execute(
            sa.text(
                "UPDATE user_subscriptions SET plan_name = :n "
                "WHERE plan_id = :p AND (plan_name IS NULL OR plan_name = '')"
            ),
            {"n": name, "p": plan_id},
        )


def downgrade() -> None:
    op.drop_column("user_subscriptions", "plan_name")
