"""template versions — baris template_versions untuk template hasil seed

Revision ID: 0005_template_versions
Revises: 0004_subscription_plan_name
Create Date: 2026-10-10
"""
from datetime import datetime

import sqlalchemy as sa
from alembic import op

revision = "0005_template_versions"
down_revision = "0004_subscription_plan_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, file_path, created_by FROM templates")).fetchall()
    for template_id, file_path, created_by in rows:
        existing = bind.execute(
            sa.text(
                "SELECT COUNT(*) FROM template_versions "
                "WHERE template_id = :t AND version = 1"
            ),
            {"t": template_id},
        ).scalar_one()
        if existing == 0:
            bind.execute(
                sa.text(
                    "INSERT INTO template_versions "
                    "(template_id, version, file_path, notes, created_by, created_at) "
                    "VALUES (:t, 1, :fp, 'Versi awal', :cb, :now)"
                ),
                {
                    "t": template_id,
                    "fp": file_path or f"/storage/templates/{template_id}/v1.docx",
                    "cb": created_by,
                    "now": datetime.now(),
                },
            )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DELETE FROM template_versions WHERE notes = 'Versi awal'"))
