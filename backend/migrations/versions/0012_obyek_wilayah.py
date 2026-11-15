"""obyek wilayah — relasi obyek ke wilayah

Revision ID: 0012_obyek_wilayah
Revises: 0011_pekerjaan
Create Date: 2026-10-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0012_obyek_wilayah"
down_revision = "0011_pekerjaan"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Kosongkan tabel obyek
    op.execute("TRUNCATE TABLE obyek")

    # 2. Hapus kolom letak_id
    op.drop_column("obyek", "letak_id")

    # 3. Tambah kolom wilayah_id
    op.add_column("obyek", sa.Column("wilayah_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_obyek_wilayah", "obyek", "wilayah", ["wilayah_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_obyek_wilayah", "obyek", type_="foreignkey")
    op.drop_column("obyek", "wilayah_id")
    op.add_column("obyek", sa.Column("letak_id", sa.Integer(), nullable=True))
