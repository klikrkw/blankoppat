"""audit record_id length — perbesar kolom record_id

Revision ID: 0014_audit_record_id
Revises: 0013_document_uuid
Create Date: 2026-10-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0014_audit_record_id"
down_revision = "0013_document_uuid"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "audit_logs",
        "record_id",
        existing_type=sa.String(80),
        type_=sa.String(255),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "audit_logs",
        "record_id",
        existing_type=sa.String(255),
        type_=sa.String(80),
        existing_nullable=True,
    )
