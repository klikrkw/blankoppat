"""document uuid — primary key documents jadi string auto-generate

Revision ID: 0013_document_uuid
Revises: 0012_obyek_wilayah
Create Date: 2026-10-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0013_document_uuid"
down_revision = "0012_obyek_wilayah"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    # Hapus tabel turunan lalu tabel dokumen (data dokumen dapat digenerate ulang).
    for table in (
        "document_snapshots",
        "document_custom_values",
        "document_objects",
        "document_parties",
        "documents",
    ):
        bind.execute(sa.text(f"DROP TABLE IF EXISTS {table}"))

    from app.models import Base

    Base.metadata.create_all(bind=bind, checkfirst=True)


def downgrade() -> None:
    # Tidak ada downgrade yang aman; tabel dokumen lama sudah tidak relevan.
    pass
