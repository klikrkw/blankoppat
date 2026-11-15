"""hapus relasi settings dengan users (system_setting_users)

Settings kini bersifat global: tidak ada lagi daftar user terkait.
Semua user aktif otomatis tersedia di template melalui system.users.

Revision ID: 0039_drop_system_setting_users
Revises: 0038_restore_demo_users
Create Date: 2026-11-13
"""
import sqlalchemy as sa
from alembic import op

revision = "0039_drop_system_setting_users"
down_revision = "0038_restore_demo_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "system_setting_users" in inspector.get_table_names():
        op.drop_table("system_setting_users")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "system_setting_users" in inspector.get_table_names():
        return
    op.create_table(
        "system_setting_users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("posisi", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_system_setting_users_user"),
    )
    op.create_index(
        "ix_system_setting_users_user_id", "system_setting_users", ["user_id"], unique=False
    )
