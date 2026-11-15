"""pihak roles — tabel master peran pihak + seed

Revision ID: 0015_pihak_roles
Revises: 0014_audit_record_id
Create Date: 2026-10-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0015_pihak_roles"
down_revision = "0014_audit_record_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pihak_roles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("role", sa.String(40), nullable=False),
        sa.Column("sebutan", sa.String(60), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("role", name="uq_pihak_roles_role"),
    )

    bind = op.get_bind()
    seed = [
        ("PENJUAL", "PIHAK PERTAMA"),
        ("PEMBELI", "PIHAK KEDUA"),
        ("SAKSI", "SAKSI"),
        ("PELEPAS", "PELEPAS HAK"),
        ("PENERIMA", "PENERIMA HAK"),
    ]
    for role, sebutan in seed:
        bind.execute(
            sa.text("INSERT INTO pihak_roles (role, sebutan, is_active) VALUES (:r, :s, 1)"),
            {"r": role, "s": sebutan},
        )


def downgrade() -> None:
    op.drop_table("pihak_roles")
