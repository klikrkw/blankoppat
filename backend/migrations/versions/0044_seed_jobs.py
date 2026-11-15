"""seed data jobs: BPKAD dan BPN

Revision ID: 0044_seed_jobs
Revises: 0043_jobs_staff
Create Date: 2026-11-14
"""
import sqlalchemy as sa
from alembic import op

revision = "0044_seed_jobs"
down_revision = "0043_jobs_staff"
branch_labels = None
depends_on = None

JOBS = [
    ("BPKAD", "petugas khusus BPKAD"),
    ("BPN", "petugas ke BPN"),
]


def upgrade() -> None:
    bind = op.get_bind()
    for name, description in JOBS:
        exists = bind.execute(
            sa.text("SELECT id FROM jobs WHERE LOWER(name) = LOWER(:name)"), {"name": name}
        ).first()
        if exists:
            continue
        bind.execute(
            sa.text("INSERT INTO jobs (name, description) VALUES (:name, :description)"),
            {"name": name, "description": description},
        )


def downgrade() -> None:
    bind = op.get_bind()
    for name, _ in JOBS:
        bind.execute(
            sa.text("DELETE FROM jobs WHERE LOWER(name) = LOWER(:name)"), {"name": name}
        )
