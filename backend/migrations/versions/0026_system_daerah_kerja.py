"""system_settings daerah_kerja — tambah pengaturan daerah kerja PPAT

Revision ID: 0026_system_daerah_kerja
Revises: 0025_seed_pekerjaan
Create Date: 2026-10-31
"""
import sqlalchemy as sa
from alembic import op

revision = "0026_system_daerah_kerja"
down_revision = "0025_seed_pekerjaan"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    exists = conn.execute(
        sa.text("SELECT id FROM system_settings WHERE `key` = 'daerah_kerja'")
    ).first()
    if exists:
        return
    conn.execute(
        sa.text("INSERT INTO system_settings (`key`, value, created_at, updated_at) VALUES (:k, :v, NOW(), NOW())"),
        {"k": "daerah_kerja", "v": "Kabupaten Pati"},
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text("DELETE FROM system_settings WHERE `key` = 'daerah_kerja'")
    )
