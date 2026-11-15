"""ektp wilayah — relasi ektp ke wilayah

Revision ID: 0009_ektp_wilayah
Revises: 0008_wilayah_tipe
Create Date: 2026-10-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0009_ektp_wilayah"
down_revision = "0008_wilayah_tipe"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Kosongkan tabel ektp
    op.execute("TRUNCATE TABLE ektp")

    # 2. Hapus kolom lama
    op.drop_column("ektp", "kelurahan")
    op.drop_column("ektp", "kecamatan")
    op.drop_column("ektp", "kabupaten")

    # 3. Tambah kolom wilayah_id
    op.add_column("ektp", sa.Column("wilayah_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_ektp_wilayah", "ektp", "wilayah", ["wilayah_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_ektp_wilayah", "ektp", type_="foreignkey")
    op.drop_column("ektp", "wilayah_id")
    op.add_column("ektp", sa.Column("kelurahan", sa.String(100), default=""))
    op.add_column("ektp", sa.Column("kecamatan", sa.String(100), default=""))
    op.add_column("ektp", sa.Column("kabupaten", sa.String(100), default=""))
