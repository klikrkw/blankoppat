"""pekerjaan — tabel pekerjaan + data awal

Revision ID: 0011_pekerjaan
Revises: 0010_ektp_status_perkawinan
Create Date: 2026-10-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0011_pekerjaan"
down_revision = "0010_ektp_status_perkawinan"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pekerjaan",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nama_pekerjaan", sa.String(150), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    bind = op.get_bind()
    initial = [
        "Belum/Tidak Bekerja",
        "Buruh Tani/Perkebunan",
        "Wiraswasta",
        "Pegawai Negeri Sipil",
        "Karyawan Swasta",
    ]
    for nama in initial:
        bind.execute(
            sa.text("INSERT INTO pekerjaan (nama_pekerjaan) VALUES (:n)"),
            {"n": nama},
        )


def downgrade() -> None:
    op.drop_table("pekerjaan")
