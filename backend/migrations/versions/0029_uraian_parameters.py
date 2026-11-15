"""uraian parameters — dukung parameter dinamis

Revision ID: 0029_uraian_parameters
Revises: 0028_obyek_nomor_seri_blanko
Create Date: 2026-11-07
"""
import sqlalchemy as sa
from alembic import op

revision = "0029_uraian_parameters"
down_revision = "0028_obyek_nomor_seri_blanko"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("uraian", sa.Column("parameters", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("uraian", "parameters")
