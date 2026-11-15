"""uraian unique — nama_uraian harus unik

Revision ID: 0024_uraian_unique
Revises: 0023_uraian
Create Date: 2026-10-31
"""
from alembic import op

revision = "0024_uraian_unique"
down_revision = "0023_uraian"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_uraian_nama_uraian", table_name="uraian")
    op.create_index("ix_uraian_nama_uraian", "uraian", ["nama_uraian"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_uraian_nama_uraian", table_name="uraian")
    op.create_index("ix_uraian_nama_uraian", "uraian", ["nama_uraian"], unique=False)
