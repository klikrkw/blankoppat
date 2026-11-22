"""tambah relasi pihak pada sections

Section dapat dikaitkan ke satu pihak sehingga dapat dipanggil di template
berdasarkan parameter pihak, mis. `section('Kuasa', 'PENERIMA_KUASA')`
atau `section('Kuasa', p)` di dalam loop peran.

Revision ID: 0047_section_pihak
Revises: 0046_pihak_parent
Create Date: 2026-11-20
"""
import sqlalchemy as sa
from alembic import op

revision = "0047_section_pihak"
down_revision = "0046_pihak_parent"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("sections")}
    if "pihak_id" not in columns:
        op.add_column("sections", sa.Column("pihak_id", sa.String(length=36), nullable=True))
        op.create_foreign_key(
            "fk_sections_pihak",
            "sections",
            "pihak",
            ["pihak_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index("ix_sections_pihak_id", "sections", ["pihak_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("sections")}
    if "pihak_id" in columns:
        op.drop_column("sections", "pihak_id")
