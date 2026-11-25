"""tabel jabatan dan pejabat

Pejabat adalah data per transaksi yang menghubungkan jabatan, e-KTP, dan
role_name (kepala_desa / perangkat_desa). Satu transaksi dapat memiliki banyak
pejabat.

Revision ID: 0050_pejabat
Revises: 0049_seed_gelar
Create Date: 2026-11-25
"""
import sqlalchemy as sa
from alembic import op

revision = "0050_pejabat"
down_revision = "0049_seed_gelar"
branch_labels = None
depends_on = None

JABATAN = [
    "Kepala Desa",
    "Sekretaris Desa",
    "Kaur Pemerintahan",
    "Kaur Pembangunan",
    "Kaur Umum",
    "Kaur Keuangan",
    "Kepala Dusun",
    "Bendahara Desa",
    "Ketua BPD",
    "Anggota BPD",
    "Perangkat Desa",
]


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())

    if "jabatan" not in tables:
        op.create_table(
            "jabatan",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("nama_jabatan", sa.String(length=150), nullable=False),
            sa.UniqueConstraint("nama_jabatan", name="uq_jabatan_nama"),
        )
        op.create_index("ix_jabatan_nama_jabatan", "jabatan", ["nama_jabatan"], unique=False)

    tables = set(sa.inspect(bind).get_table_names())
    if "pejabat" not in tables:
        op.create_table(
            "pejabat",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("transaksi_id", sa.String(length=36), nullable=False),
            sa.Column("jabatan_id", sa.Integer(), nullable=True),
            sa.Column("ektp_id", sa.BigInteger(), nullable=False),
            sa.Column("role_name", sa.String(length=30), nullable=False, server_default="perangkat_desa"),
            sa.Column("urutan", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["transaksi_id"], ["transaksi.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["jabatan_id"], ["jabatan.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["ektp_id"], ["ektp.id"], ondelete="CASCADE"),
        )
        op.create_index("ix_pejabat_transaksi_id", "pejabat", ["transaksi_id"], unique=False)
        op.create_index("ix_pejabat_jabatan_id", "pejabat", ["jabatan_id"], unique=False)
        op.create_index("ix_pejabat_ektp_id", "pejabat", ["ektp_id"], unique=False)
        op.create_index("ix_pejabat_role_name", "pejabat", ["role_name"], unique=False)

    if "jabatan" in set(sa.inspect(bind).get_table_names()):
        for nama in JABATAN:
            exists = bind.execute(
                sa.text("SELECT id FROM jabatan WHERE LOWER(nama_jabatan) = LOWER(:n)"),
                {"n": nama},
            ).first()
            if not exists:
                bind.execute(
                    sa.text("INSERT INTO jabatan (nama_jabatan) VALUES (:n)"),
                    {"n": nama},
                )


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "pejabat" in tables:
        op.drop_table("pejabat")
    tables = set(sa.inspect(bind).get_table_names())
    if "jabatan" in tables:
        op.drop_table("jabatan")
