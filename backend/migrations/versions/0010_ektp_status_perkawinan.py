"""ektp status_perkawinan — enum status_perkawinan pada tabel ektp

Revision ID: 0010_ektp_status_perkawinan
Revises: 0009_ektp_wilayah
Create Date: 2026-10-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0010_ektp_status_perkawinan"
down_revision = "0009_ektp_wilayah"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("ektp")]

    if "status_perkawinan" in columns:
        op.drop_column("ektp", "status_perkawinan")

    op.add_column(
        "ektp",
        sa.Column(
            "status_perkawinan",
            sa.Enum("Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati", name="status_perkawinan_enum"),
            nullable=False,
            server_default="Belum Kawin",
        ),
    )


def downgrade() -> None:
    op.drop_column("ektp", "status_perkawinan")
    op.add_column("ektp", sa.Column("status_perkawinan", sa.String(30), default=""))
