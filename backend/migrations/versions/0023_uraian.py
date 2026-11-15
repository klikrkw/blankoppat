"""uraian — tabel master uraian (nama + isi teks panjang)

Revision ID: 0023_uraian
Revises: 0022_obyek_nop
Create Date: 2026-10-31
"""
import sqlalchemy as sa
from alembic import op

revision = "0023_uraian"
down_revision = "0022_obyek_nop"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "uraian",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("nama_uraian", sa.String(length=200), nullable=False),
        sa.Column("isi_uraian", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_uraian_nama_uraian", "uraian", ["nama_uraian"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_uraian_nama_uraian", table_name="uraian")
    op.drop_table("uraian")
