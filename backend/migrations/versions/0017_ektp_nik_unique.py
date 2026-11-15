"""ektp nik unik — hapus duplikat & buat unique index nik

Revision ID: 0017_ektp_nik_unique
Revises: 0016_pihak_role_fk
Create Date: 2026-10-25
"""
import sqlalchemy as sa
from alembic import op

revision = "0017_ektp_nik_unique"
down_revision = "0016_pihak_role_fk"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # Hapus duplikat: pertahankan id terkecil per NIK, hapus sisanya beserta relasinya.
    dup_ids = [
        row[0]
        for row in bind.execute(sa.text(
            "SELECT e.id FROM ektp e "
            "JOIN (SELECT nik, MIN(id) AS keep_id FROM ektp GROUP BY nik HAVING COUNT(*) > 1) d "
            "  ON d.nik = e.nik AND e.id <> d.keep_id"
        )).fetchall()
    ]
    for ektp_id in dup_ids:
        bind.execute(sa.text("DELETE FROM pihak_ektp WHERE ektp_id = :id"), {"id": ektp_id})
        bind.execute(sa.text("DELETE FROM ektp WHERE id = :id"), {"id": ektp_id})

    # Ganti index biasa menjadi unik.
    try:
        op.drop_index("ix_ektp_nik", table_name="ektp")
    except Exception:
        pass
    op.create_index("ix_ektp_nik", "ektp", ["nik"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_ektp_nik", table_name="ektp")
    op.create_index("ix_ektp_nik", "ektp", ["nik"], unique=False)
