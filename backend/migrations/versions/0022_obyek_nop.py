"""obyek nop — tambah kolom NOP (Nomor Objek Pajak)

Revision ID: 0022_obyek_nop
Revises: 0021_seed_ektp_paragraph
Create Date: 2026-10-30
"""
import sqlalchemy as sa
from alembic import op

revision = "0022_obyek_nop"
down_revision = "0021_seed_ektp_paragraph"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("obyek", sa.Column("nop", sa.String(length=30), nullable=True, server_default=""))
    op.create_index("ix_obyek_nop", "obyek", ["nop"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_obyek_nop", table_name="obyek")
    op.drop_column("obyek", "nop")
