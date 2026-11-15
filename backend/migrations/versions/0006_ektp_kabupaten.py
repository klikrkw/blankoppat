"""ektp kabupaten — kolom kabupaten pada tabel ektp

Revision ID: 0006_ektp_kabupaten
Revises: 0005_template_versions
Create Date: 2026-10-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0006_ektp_kabupaten"
down_revision = "0005_template_versions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("ektp")]
    if "kabupaten" not in columns:
        op.add_column(
            "ektp",
            sa.Column("kabupaten", sa.String(100), nullable=True, server_default=""),
        )


def downgrade() -> None:
    op.drop_column("ektp", "kabupaten")
