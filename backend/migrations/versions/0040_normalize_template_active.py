"""normalisasi is_active group & kategori template

Baris hasil seed awal tidak mengisi is_active sehingga tersimpan NULL dan
dianggap nonaktif di UI.

Revision ID: 0040_normalize_template_active
Revises: 0039_drop_system_setting_users
Create Date: 2026-11-13
"""
import sqlalchemy as sa
from alembic import op

revision = "0040_normalize_template_active"
down_revision = "0039_drop_system_setting_users"
branch_labels = None
depends_on = None

TABLES = ("template_groups", "template_categories")


def upgrade() -> None:
    bind = op.get_bind()
    for table in TABLES:
        bind.execute(sa.text(f"UPDATE {table} SET is_active = 1 WHERE is_active IS NULL"))


def downgrade() -> None:
    # Tidak dikembalikan ke NULL; NULL bukan nilai yang valid untuk is_active.
    pass
