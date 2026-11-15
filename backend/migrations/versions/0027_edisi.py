"""edisi — tabel edisi + relasi ke obyek

Revision ID: 0027_edisi
Revises: 0026_system_daerah_kerja
Create Date: 2026-10-31
"""
import sqlalchemy as sa
from alembic import op

revision = "0027_edisi"
down_revision = "0026_system_daerah_kerja"
branch_labels = None
depends_on = None

SEED = ["Edisi 1 Pengakuan Hak", "Edisi 1 Waris", "Edisi 1 Penataan Batas"]


def upgrade() -> None:
    op.create_table(
        "edisi",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("nama_edisi", sa.String(length=150), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_edisi_nama_edisi", "edisi", ["nama_edisi"], unique=True)

    conn = op.get_bind()
    for nama in SEED:
        exists = conn.execute(
            sa.text("SELECT id FROM edisi WHERE nama_edisi = :n"), {"n": nama}
        ).first()
        if not exists:
            conn.execute(
                sa.text(
                    "INSERT INTO edisi (nama_edisi, created_at, updated_at) "
                    "VALUES (:n, NOW(), NOW())"
                ),
                {"n": nama},
            )

    op.add_column("obyek", sa.Column("edisi_id", sa.Integer(), nullable=True))
    op.create_index("ix_obyek_edisi_id", "obyek", ["edisi_id"], unique=False)
    op.create_foreign_key(
        "fk_obyek_edisi", "obyek", "edisi", ["edisi_id"], ["id"], ondelete="SET NULL"
    )


def downgrade() -> None:
    op.drop_constraint("fk_obyek_edisi", "obyek", type_="foreignkey")
    op.drop_index("ix_obyek_edisi_id", table_name="obyek")
    op.drop_column("obyek", "edisi_id")
    op.drop_index("ix_edisi_nama_edisi", table_name="edisi")
    op.drop_table("edisi")
