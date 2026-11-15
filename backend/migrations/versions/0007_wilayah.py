"""wilayah — tabel wilayah administrasi

Revision ID: 0007_wilayah
Revises: 0006_ektp_kabupaten
Create Date: 2026-10-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0007_wilayah"
down_revision = "0006_ektp_kabupaten"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "wilayah",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("kode_wilayah", sa.String(20), nullable=False),
        sa.Column("desa", sa.String(150), nullable=True),
        sa.Column("kecamatan", sa.String(150), nullable=True),
        sa.Column("kabupaten", sa.String(150), nullable=True),
        sa.Column("provinsi", sa.String(150), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_wilayah_kode_wilayah", "wilayah", ["kode_wilayah"], unique=True)
    op.create_index("ix_wilayah_kecamatan", "wilayah", ["kecamatan"], unique=False)
    op.create_index("ix_wilayah_kabupaten", "wilayah", ["kabupaten"], unique=False)
    op.create_index("ix_wilayah_provinsi", "wilayah", ["provinsi"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_wilayah_provinsi", table_name="wilayah")
    op.drop_index("ix_wilayah_kabupaten", table_name="wilayah")
    op.drop_index("ix_wilayah_kecamatan", table_name="wilayah")
    op.drop_index("ix_wilayah_kode_wilayah", table_name="wilayah")
    op.drop_table("wilayah")
