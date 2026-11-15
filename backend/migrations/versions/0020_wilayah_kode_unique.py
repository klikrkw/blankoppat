"""wilayah kode unik — unique index kode_wilayah

Revision ID: 0020_wilayah_kode_unique
Revises: 0019_provinsi_timestamps
Create Date: 2026-10-25
"""
import sqlalchemy as sa
from alembic import op

revision = "0020_wilayah_kode_unique"
down_revision = "0019_provinsi_timestamps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_wilayah_kode_wilayah", table_name="wilayah")
    op.create_index("ix_wilayah_kode_wilayah", "wilayah", ["kode_wilayah"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_wilayah_kode_wilayah", table_name="wilayah")
    op.create_index("ix_wilayah_kode_wilayah", "wilayah", ["kode_wilayah"], unique=False)
