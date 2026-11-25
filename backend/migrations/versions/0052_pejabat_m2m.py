"""pejabat independen + relasi many-to-many transaksi_pejabat

Pejabat tidak lagi menyimpan transaksi_id langsung. Relasi ke transaksi
disimpan di tabel transaksi_pejabat. Data lama dipindahkan ke tabel relasi
sebelum kolom transaksi_id/urutan dihapus dari pejabat.

Revision ID: 0052_pejabat_m2m
Revises: 0051_pejabat_wilayah
Create Date: 2026-11-25
"""
import sqlalchemy as sa
from alembic import op

revision = "0052_pejabat_m2m"
down_revision = "0051_pejabat_wilayah"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "transaksi_pejabat" not in tables:
        op.create_table(
            "transaksi_pejabat",
            sa.Column("transaksi_id", sa.String(length=36), nullable=False),
            sa.Column("pejabat_id", sa.Integer(), nullable=False),
            sa.Column("urutan", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["transaksi_id"], ["transaksi.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["pejabat_id"], ["pejabat.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("transaksi_id", "pejabat_id"),
        )
        op.create_index(
            "ix_transaksi_pejabat_transaksi_id",
            "transaksi_pejabat",
            ["transaksi_id"],
            unique=False,
        )
        op.create_index(
            "ix_transaksi_pejabat_pejabat_id",
            "transaksi_pejabat",
            ["pejabat_id"],
            unique=False,
        )

    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("pejabat")}
    if "transaksi_id" in columns:
        bind.execute(
            sa.text(
                "INSERT INTO transaksi_pejabat (transaksi_id, pejabat_id, urutan) "
                "SELECT transaksi_id, id, COALESCE(urutan, 0) FROM pejabat "
                "WHERE transaksi_id IS NOT NULL"
            )
        )

        if bind.dialect.name == "sqlite":
            with op.batch_alter_table("pejabat") as batch:
                batch.drop_column("transaksi_id")
                if "urutan" in columns:
                    batch.drop_column("urutan")
        else:
            for fk in inspector.get_foreign_keys("pejabat"):
                if fk.get("constrained_columns") == ["transaksi_id"] and fk.get("name"):
                    op.drop_constraint(fk["name"], "pejabat", type_="foreignkey")
            for index in inspector.get_indexes("pejabat"):
                if index.get("column_names") == ["transaksi_id"] and index.get("name"):
                    op.drop_index(index["name"], table_name="pejabat")
            op.drop_column("pejabat", "transaksi_id")
            if "urutan" in columns:
                op.drop_column("pejabat", "urutan")
    elif "urutan" in columns:
        if bind.dialect.name == "sqlite":
            with op.batch_alter_table("pejabat") as batch:
                batch.drop_column("urutan")
        else:
            op.drop_column("pejabat", "urutan")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("pejabat")}
    if "transaksi_id" not in columns:
        op.add_column("pejabat", sa.Column("transaksi_id", sa.String(length=36), nullable=True))
        op.create_foreign_key(
            "fk_pejabat_transaksi",
            "pejabat",
            "transaksi",
            ["transaksi_id"],
            ["id"],
            ondelete="CASCADE",
        )
        op.create_index("ix_pejabat_transaksi_id", "pejabat", ["transaksi_id"], unique=False)
    if "urutan" not in columns:
        op.add_column("pejabat", sa.Column("urutan", sa.Integer(), nullable=True))

    inspector = sa.inspect(bind)
    if "transaksi_pejabat" in set(inspector.get_table_names()):
        bind.execute(
            sa.text(
                "UPDATE pejabat SET transaksi_id = ("
                "SELECT tp.transaksi_id FROM transaksi_pejabat tp "
                "WHERE tp.pejabat_id = pejabat.id LIMIT 1)"
            )
        )
        op.drop_table("transaksi_pejabat")
