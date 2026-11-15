"""tabel jobs dan staff

Jobs berisi daftar jabatan/pekerjaan (name, description). Staff mengaitkan
e-KTP dengan job dan menyimpan jabatan spesifik.

Revision ID: 0043_jobs_staff
Revises: 0042_section_short_text
Create Date: 2026-11-14
"""
import sqlalchemy as sa
from alembic import op

revision = "0043_jobs_staff"
down_revision = "0042_section_short_text"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "jobs" not in tables:
        op.create_table(
            "jobs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("name", sa.String(length=150), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("name", name="uq_jobs_name"),
        )
        op.create_index("ix_jobs_name", "jobs", ["name"], unique=False)

    tables = set(sa.inspect(bind).get_table_names())
    if "staff" not in tables:
        op.create_table(
            "staff",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("ektp_id", sa.BigInteger(), nullable=False),
            sa.Column("job_id", sa.Integer(), nullable=True),
            sa.Column("jabatan", sa.String(length=150), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["ektp_id"], ["ektp.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="SET NULL"),
        )
        op.create_index("ix_staff_ektp_id", "staff", ["ektp_id"], unique=False)
        op.create_index("ix_staff_job_id", "staff", ["job_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "staff" in tables:
        op.drop_table("staff")
    tables = set(sa.inspect(bind).get_table_names())
    if "jobs" in tables:
        op.drop_table("jobs")
