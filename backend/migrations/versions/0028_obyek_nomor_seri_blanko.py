"""obyek nomor_seri_blanko — nomor seri blanko

Revision ID: 0028_obyek_nomor_seri_blanko
Revises: 0027_edisi
Create Date: 2026-10-31
"""
import sqlalchemy as sa
from alembic import op

revision = "0028_obyek_nomor_seri_blanko"
down_revision = "0027_edisi"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "obyek",
        sa.Column("nomor_seri_blanko", sa.String(length=100), nullable=True, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("obyek", "nomor_seri_blanko")
