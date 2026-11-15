"""hapus user demo (password demo)

Revision ID: 0037_remove_demo_users
Revises: 0036_seed_demo_users
Create Date: 2026-11-13
"""
import sqlalchemy as sa
from alembic import op

revision = "0037_remove_demo_users"
down_revision = "0036_seed_demo_users"
branch_labels = None
depends_on = None

USERNAMES = ["admin_demo", "operator_demo", "viewer_demo"]


def upgrade() -> None:
    conn = op.get_bind()
    for username in USERNAMES:
        row = conn.execute(
            sa.text("SELECT id FROM users WHERE username = :u"), {"u": username}
        ).first()
        if not row:
            continue
        user_id = row[0]
        conn.execute(sa.text("DELETE FROM user_roles WHERE user_id = :u"), {"u": user_id})
        conn.execute(sa.text("DELETE FROM users WHERE id = :u"), {"u": user_id})


def downgrade() -> None:
    # Tidak membuat ulang user demo; gunakan halaman Users jika diperlukan.
    pass
