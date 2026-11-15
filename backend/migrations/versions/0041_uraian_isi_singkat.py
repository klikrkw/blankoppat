"""tambah kolom isi_singkat pada master uraian

Isi singkat dipakai lewat fungsi template `uraian_singkat('Nama', ...)`
dan mendukung parameter yang sama seperti isi uraian.

Revision ID: 0041_uraian_isi_singkat
Revises: 0040_normalize_template_active
Create Date: 2026-11-14
"""
import sqlalchemy as sa
from alembic import op

revision = "0041_uraian_isi_singkat"
down_revision = "0040_normalize_template_active"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {col["name"] for col in sa.inspect(bind).get_columns("uraian")}
    if "isi_singkat" not in columns:
        op.add_column("uraian", sa.Column("isi_singkat", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    columns = {col["name"] for col in sa.inspect(bind).get_columns("uraian")}
    if "isi_singkat" in columns:
        op.drop_column("uraian", "isi_singkat")
