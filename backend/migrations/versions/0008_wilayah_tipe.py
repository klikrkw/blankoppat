"""wilayah tipe & timestamp — enum tipe_desa/tipe_kabupaten dan default now()

Revision ID: 0008_wilayah_tipe
Revises: 0007_wilayah
Create Date: 2026-10-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0008_wilayah_tipe"
down_revision = "0007_wilayah"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("wilayah")]

    if "tipe_desa" not in columns:
        op.add_column(
            "wilayah",
            sa.Column(
                "tipe_desa",
                sa.Enum("Desa", "Kelurahan", name="tipe_desa_enum"),
                nullable=False,
                server_default="Desa",
            ),
        )
    if "tipe_kabupaten" not in columns:
        op.add_column(
            "wilayah",
            sa.Column(
                "tipe_kabupaten",
                sa.Enum("Kabupaten", "Kota", name="tipe_kabupaten_enum"),
                nullable=False,
                server_default="Kabupaten",
            ),
        )

    op.alter_column(
        "wilayah",
        "created_at",
        existing_type=sa.DateTime(),
        nullable=True,
        server_default=sa.text("CURRENT_TIMESTAMP"),
    )
    op.alter_column(
        "wilayah",
        "updated_at",
        existing_type=sa.DateTime(),
        nullable=True,
        server_default=sa.text("CURRENT_TIMESTAMP"),
    )


def downgrade() -> None:
    op.drop_column("wilayah", "tipe_kabupaten")
    op.drop_column("wilayah", "tipe_desa")
    op.alter_column("wilayah", "created_at", server_default=None)
    op.alter_column("wilayah", "updated_at", server_default=None)
