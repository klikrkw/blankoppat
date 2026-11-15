"""system_settings wilayah_id — relasi pengaturan sistem ke master wilayah

Revision ID: 0030_system_settings_wilayah
Revises: 0029_uraian_parameters
Create Date: 2026-11-09
"""
import sqlalchemy as sa
from alembic import op

revision = "0030_system_settings_wilayah"
down_revision = "0029_uraian_parameters"
branch_labels = None
depends_on = None

FK_NAME = "fk_system_settings_wilayah"
IX_NAME = "ix_system_settings_wilayah_id"


def _column_exists(table: str, column: str) -> bool:
    return column in {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}


def _fk_exists(table: str, name: str) -> bool:
    return name in {fk["name"] for fk in sa.inspect(op.get_bind()).get_foreign_keys(table)}


def _index_exists(table: str, name: str) -> bool:
    return name in {ix["name"] for ix in sa.inspect(op.get_bind()).get_indexes(table)}


def upgrade() -> None:
    if not _column_exists("system_settings", "wilayah_id"):
        op.add_column(
            "system_settings",
            sa.Column("wilayah_id", sa.Integer(), nullable=True),
        )
    if not _fk_exists("system_settings", FK_NAME):
        op.create_foreign_key(
            FK_NAME,
            "system_settings",
            "wilayah",
            ["wilayah_id"],
            ["id"],
            ondelete="SET NULL",
        )
    if not _index_exists("system_settings", IX_NAME):
        op.create_index(IX_NAME, "system_settings", ["wilayah_id"])


def downgrade() -> None:
    if _index_exists("system_settings", IX_NAME):
        op.drop_index(IX_NAME, table_name="system_settings")
    if _fk_exists("system_settings", FK_NAME):
        op.drop_constraint(FK_NAME, "system_settings", type_="foreignkey")
    if _column_exists("system_settings", "wilayah_id"):
        op.drop_column("system_settings", "wilayah_id")
