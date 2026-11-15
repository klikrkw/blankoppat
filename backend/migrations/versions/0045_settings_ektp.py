"""tambah relasi ektp pada system_settings

Identitas PPAT/Notaris pada Settings dapat dikaitkan ke satu e-KTP sehingga
data lengkapnya bisa dipanggil di template lewat {{system.ektp.*}}.

Revision ID: 0045_settings_ektp
Revises: 0044_seed_jobs
Create Date: 2026-11-14
"""
import sqlalchemy as sa
from alembic import op

revision = "0045_settings_ektp"
down_revision = "0044_seed_jobs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("system_settings")}
    if "ektp_id" not in columns:
        op.add_column("system_settings", sa.Column("ektp_id", sa.BigInteger(), nullable=True))
        op.create_foreign_key(
            "fk_system_settings_ektp",
            "system_settings",
            "ektp",
            ["ektp_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index(
            "ix_system_settings_ektp_id", "system_settings", ["ektp_id"], unique=False
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("system_settings")}
    if "ektp_id" in columns:
        op.drop_column("system_settings", "ektp_id")
