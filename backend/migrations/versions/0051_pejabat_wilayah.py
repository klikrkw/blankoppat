"""tambah wilayah_id pada pejabat

Pejabat dapat dikaitkan dengan wilayah (desa/kelurahan) dari master wilayah.

Revision ID: 0051_pejabat_wilayah
Revises: 0050_pejabat
Create Date: 2026-11-25
"""
import sqlalchemy as sa
from alembic import op

revision = "0051_pejabat_wilayah"
down_revision = "0050_pejabat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "pejabat" not in set(inspector.get_table_names()):
        return
    columns = {col["name"] for col in inspector.get_columns("pejabat")}
    if "wilayah_id" not in columns:
        op.add_column("pejabat", sa.Column("wilayah_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_pejabat_wilayah",
            "pejabat",
            "wilayah",
            ["wilayah_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index("ix_pejabat_wilayah_id", "pejabat", ["wilayah_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "pejabat" not in set(inspector.get_table_names()):
        return
    columns = {col["name"] for col in inspector.get_columns("pejabat")}
    if "wilayah_id" in columns:
        op.drop_column("pejabat", "wilayah_id")
