"""tambah kolom short_text pada sections

Short text terisi otomatis dari isi singkat uraian saat uraian dipilih,
dan tetap dapat diedit manual per section.

Revision ID: 0042_section_short_text
Revises: 0041_uraian_isi_singkat
Create Date: 2026-11-14
"""
import sqlalchemy as sa
from alembic import op

revision = "0042_section_short_text"
down_revision = "0041_uraian_isi_singkat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {col["name"] for col in sa.inspect(bind).get_columns("sections")}
    if "short_text" not in columns:
        op.add_column("sections", sa.Column("short_text", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    columns = {col["name"] for col in sa.inspect(bind).get_columns("sections")}
    if "short_text" in columns:
        op.drop_column("sections", "short_text")
