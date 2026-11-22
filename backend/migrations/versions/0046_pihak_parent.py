"""relasi parent/child pada pihak

Satu pihak dapat memiliki satu induk (parent). Child dapat dipanggil di
template melalui `p.children`, parent melalui `p.parent`.

Revision ID: 0046_pihak_parent
Revises: 0045_settings_ektp
Create Date: 2026-11-20
"""
import sqlalchemy as sa
from alembic import op

revision = "0046_pihak_parent"
down_revision = "0045_settings_ektp"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("pihak")}
    if "parent_id" not in columns:
        op.add_column("pihak", sa.Column("parent_id", sa.String(length=36), nullable=True))
        op.create_foreign_key(
            "fk_pihak_parent",
            "pihak",
            "pihak",
            ["parent_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index("ix_pihak_parent_id", "pihak", ["parent_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("pihak")}
    if "parent_id" in columns:
        op.drop_column("pihak", "parent_id")
