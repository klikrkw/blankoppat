"""items & sections — master item dan bagian transaksi

Revision ID: 0031_items_sections
Revises: 0029_uraian_parameters
Create Date: 2026-11-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0031_items_sections"
down_revision = "0030_system_settings_wilayah"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("nama_item", sa.String(length=200), nullable=False),
        sa.Column("keterangan", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_items_nama_item", "items", ["nama_item"], unique=True)

    op.create_table(
        "sections",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("transaksi_id", sa.String(length=36), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("uraian_id", sa.Integer(), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("urutan", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["transaksi_id"], ["transaksi.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["item_id"], ["items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uraian_id"], ["uraian.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_sections_transaksi_id", "sections", ["transaksi_id"], unique=False)
    op.create_index("ix_sections_item_id", "sections", ["item_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_sections_item_id", table_name="sections")
    op.drop_index("ix_sections_transaksi_id", table_name="sections")
    op.drop_table("sections")
    op.drop_index("ix_items_nama_item", table_name="items")
    op.drop_table("items")
