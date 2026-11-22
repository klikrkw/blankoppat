"""tabel gelar

Master gelar berisi singkatan dan kepanjangan, mis. "S.H." -> "Sarjana Hukum".

Revision ID: 0048_gelar
Revises: 0047_section_pihak
Create Date: 2026-11-22
"""
import sqlalchemy as sa
from alembic import op

revision = "0048_gelar"
down_revision = "0047_section_pihak"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "gelar" not in tables:
        op.create_table(
            "gelar",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("singkatan", sa.String(length=50), nullable=False),
            sa.Column("kepanjangan", sa.String(length=150), nullable=False),
            sa.UniqueConstraint("singkatan", name="uq_gelar_singkatan"),
        )
        op.create_index("ix_gelar_singkatan", "gelar", ["singkatan"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "gelar" in tables:
        op.drop_table("gelar")
