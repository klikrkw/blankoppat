"""hapus role User

Revision ID: 0035_remove_user_role
Revises: 0034_seed_roles
Create Date: 2026-11-13
"""
import sqlalchemy as sa
from alembic import op

revision = "0035_remove_user_role"
down_revision = "0034_seed_roles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    role = conn.execute(sa.text("SELECT id FROM roles WHERE name = 'User'")).first()
    if not role:
        return
    role_id = role[0]
    conn.execute(sa.text("DELETE FROM role_permissions WHERE role_id = :r"), {"r": role_id})
    conn.execute(sa.text("DELETE FROM user_roles WHERE role_id = :r"), {"r": role_id})
    conn.execute(sa.text("DELETE FROM roles WHERE id = :r"), {"r": role_id})


def downgrade() -> None:
    conn = op.get_bind()
    exists = conn.execute(sa.text("SELECT id FROM roles WHERE name = 'User'")).first()
    if exists:
        return
    conn.execute(
        sa.text(
            "INSERT INTO roles (name, description) VALUES (:n, :d)"
        ),
        {"n": "User", "d": "Pengguna: membuat transaksi dan dokumen sendiri"},
    )
