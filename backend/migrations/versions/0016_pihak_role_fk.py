"""link pihak to pihak_roles

Revision ID: 0016_pihak_role_fk
Revises: 0015_pihak_roles
Create Date: 2026-10-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0016_pihak_role_fk"
down_revision = "0015_pihak_roles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("pihak", sa.Column("pihak_role_id", sa.Integer(), nullable=True))
    op.create_index("ix_pihak_pihak_role_id", "pihak", ["pihak_role_id"], unique=False)
    op.create_foreign_key(
        "fk_pihak_pihak_role",
        "pihak",
        "pihak_roles",
        ["pihak_role_id"],
        ["id"],
        ondelete="SET NULL",
    )
    bind = op.get_bind()
    bind.execute(sa.text(
        "UPDATE pihak p JOIN pihak_roles r ON r.role = p.nama_pihak "
        "SET p.pihak_role_id = r.id WHERE p.pihak_role_id IS NULL"
    ))


def downgrade() -> None:
    op.drop_constraint("fk_pihak_pihak_role", "pihak", type_="foreignkey")
    op.drop_index("ix_pihak_pihak_role_id", table_name="pihak")
    op.drop_column("pihak", "pihak_role_id")
