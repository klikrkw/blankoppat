"""seed roles admin, operator, user

Revision ID: 0034_seed_roles
Revises: 0033_seed_custom_functions
Create Date: 2026-11-13
"""
import sqlalchemy as sa
from alembic import op

revision = "0034_seed_roles"
down_revision = "0033_seed_custom_functions"
branch_labels = None
depends_on = None

ROLES = [
    ("Admin", "Kelola master data, template, dan verifikasi pembayaran"),
    ("Operator", "Membuat transaksi dan dokumen"),
]

USER_PERMISSIONS = [
    "transaction.view", "transaction.create", "transaction.update",
    "document.view", "document.create", "document.download",
    "jenis_transaksi.view", "surat.view", "jenistransaksi_surat.view",
    "template.view", "custom_field.view",
    "subscription.view", "invoice.view", "payment.view",
]


def upgrade() -> None:
    conn = op.get_bind()
    for name, description in ROLES:
        exists = conn.execute(
            sa.text("SELECT id FROM roles WHERE name = :name"), {"name": name}
        ).first()
        if not exists:
            conn.execute(
                sa.text("INSERT INTO roles (name, description) VALUES (:name, :description)"),
                {"name": name, "description": description},
            )

    # Permission untuk role User (jika belum ada).
    user_role = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'User'")
    ).first()
    if not user_role:
        return
    user_role_id = user_role[0]
    for perm_name in USER_PERMISSIONS:
        perm = conn.execute(
            sa.text("SELECT id FROM permissions WHERE name = :name"), {"name": perm_name}
        ).first()
        if not perm:
            continue
        exists = conn.execute(
            sa.text(
                "SELECT role_id FROM role_permissions WHERE role_id = :r AND permission_id = :p"
            ),
            {"r": user_role_id, "p": perm[0]},
        ).first()
        if not exists:
            conn.execute(
                sa.text(
                    "INSERT INTO role_permissions (role_id, permission_id) VALUES (:r, :p)"
                ),
                {"r": user_role_id, "p": perm[0]},
            )


def downgrade() -> None:
    conn = op.get_bind()
    user_role = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'User'")
    ).first()
    if user_role:
        conn.execute(
            sa.text("DELETE FROM role_permissions WHERE role_id = :r"), {"r": user_role[0]}
        )
        conn.execute(
            sa.text("DELETE FROM user_roles WHERE role_id = :r"), {"r": user_role[0]}
        )
        conn.execute(sa.text("DELETE FROM roles WHERE name = 'User'"))
