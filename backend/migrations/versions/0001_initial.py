"""initial schema — seluruh tabel aplikasi + tabel existing

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-10

Menggunakan metadata SQLAlchemy dengan checkfirst=True sehingga:
- Tabel aplikasi dibuat otomatis beserta FK, index, dan constraint unik.
- Tabel existing (ektp, obyek, letak, jenishak) TIDAK disentuh
  apabila sudah ada di database.
"""
from alembic import op

from app.models import Base

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    for table in reversed(Base.metadata.sorted_tables):
        table.drop(bind=bind, checkfirst=True)
