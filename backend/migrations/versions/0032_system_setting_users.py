"""system_setting_users — relasi settings dengan banyak user

Revision ID: 0032_system_setting_users
Revises: 0031_items_sections
Create Date: 2026-11-13
"""
import sqlalchemy as sa
from alembic import op

revision = "0032_system_setting_users"
down_revision = "0031_items_sections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_setting_users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("posisi", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_system_setting_users_user"),
    )
    op.create_index(
        "ix_system_setting_users_user_id", "system_setting_users", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_system_setting_users_user_id", table_name="system_setting_users")
    op.drop_table("system_setting_users")
