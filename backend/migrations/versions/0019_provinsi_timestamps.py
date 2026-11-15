"""provinsi timestamps — tambah created_at & updated_at

Revision ID: 0019_provinsi_timestamps
Revises: 0018_provinsi
Create Date: 2026-10-25
"""
import sqlalchemy as sa
from alembic import op

revision = "0019_provinsi_timestamps"
down_revision = "0018_provinsi"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("provinsi", "code", existing_type=sa.String(2), type_=sa.String(10), existing_nullable=False)
    op.alter_column("provinsi", "name", existing_type=sa.String(150), type_=sa.String(100), existing_nullable=False)
    op.add_column("provinsi", sa.Column("created_at", sa.DateTime(), nullable=True))
    op.add_column("provinsi", sa.Column("updated_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("provinsi", "updated_at")
    op.drop_column("provinsi", "created_at")
