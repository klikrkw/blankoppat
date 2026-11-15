"""kembalikan user demo (admin, operator, viewer)

Revision ID: 0038_restore_demo_users
Revises: 0037_remove_demo_users
Create Date: 2026-11-13
"""
import bcrypt
import sqlalchemy as sa
from alembic import op

revision = "0038_restore_demo_users"
down_revision = "0037_remove_demo_users"
branch_labels = None
depends_on = None

DEMO_USERS = [
    {
        "name": "Admin Demo",
        "username": "admin_demo",
        "email": "admin_demo@blankoppat.id",
        "password": "admin123",
        "role": "Admin",
    },
    {
        "name": "Operator Demo",
        "username": "operator_demo",
        "email": "operator_demo@blankoppat.id",
        "password": "operator123",
        "role": "Operator",
    },
    {
        "name": "Viewer Demo",
        "username": "viewer_demo",
        "email": "viewer_demo@blankoppat.id",
        "password": "viewer123",
        "role": "Viewer",
    },
]


def upgrade() -> None:
    conn = op.get_bind()
    for user in DEMO_USERS:
        exists = conn.execute(
            sa.text("SELECT id FROM users WHERE username = :u"), {"u": user["username"]}
        ).first()
        if exists:
            continue
        role = conn.execute(
            sa.text("SELECT id FROM roles WHERE name = :r"), {"r": user["role"]}
        ).first()
        if not role:
            continue
        password_hash = bcrypt.hashpw(user["password"].encode(), bcrypt.gensalt()).decode()
        conn.execute(
            sa.text(
                "INSERT INTO users (name, username, email, password_hash, is_active) "
                "VALUES (:name, :username, :email, :password_hash, 1)"
            ),
            {
                "name": user["name"],
                "username": user["username"],
                "email": user["email"],
                "password_hash": password_hash,
            },
        )
        user_id = conn.execute(
            sa.text("SELECT id FROM users WHERE username = :u"), {"u": user["username"]}
        ).scalar()
        conn.execute(
            sa.text("INSERT INTO user_roles (user_id, role_id) VALUES (:u, :r)"),
            {"u": user_id, "r": role[0]},
        )


def downgrade() -> None:
    conn = op.get_bind()
    for user in DEMO_USERS:
        row = conn.execute(
            sa.text("SELECT id FROM users WHERE username = :u"), {"u": user["username"]}
        ).first()
        if not row:
            continue
        conn.execute(sa.text("DELETE FROM user_roles WHERE user_id = :u"), {"u": row[0]})
        conn.execute(sa.text("DELETE FROM users WHERE id = :u"), {"u": row[0]})
