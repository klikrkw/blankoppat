"""provinsi — tabel provinsi + seed 38 provinsi

Revision ID: 0018_provinsi
Revises: 0017_ektp_nik_unique
Create Date: 2026-10-25
"""
import sqlalchemy as sa
from alembic import op

revision = "0018_provinsi"
down_revision = "0017_ektp_nik_unique"
branch_labels = None
depends_on = None

DATA = [
    ("11", "Aceh"),
    ("12", "Sumatera Utara"),
    ("13", "Sumatera Barat"),
    ("14", "Riau"),
    ("15", "Jambi"),
    ("16", "Sumatera Selatan"),
    ("17", "Bengkulu"),
    ("18", "Lampung"),
    ("19", "Kepulauan Bangka Belitung"),
    ("21", "Kepulauan Riau"),
    ("31", "DKI Jakarta"),
    ("32", "Jawa Barat"),
    ("33", "Jawa Tengah"),
    ("34", "Daerah Istimewa Yogyakarta"),
    ("35", "Jawa Timur"),
    ("36", "Banten"),
    ("51", "Bali"),
    ("52", "Nusa Tenggara Barat"),
    ("53", "Nusa Tenggara Timur"),
    ("61", "Kalimantan Barat"),
    ("62", "Kalimantan Tengah"),
    ("63", "Kalimantan Selatan"),
    ("64", "Kalimantan Timur"),
    ("65", "Kalimantan Utara"),
    ("71", "Sulawesi Utara"),
    ("72", "Sulawesi Tengah"),
    ("73", "Sulawesi Selatan"),
    ("74", "Sulawesi Tenggara"),
    ("75", "Gorontalo"),
    ("76", "Sulawesi Barat"),
    ("81", "Maluku"),
    ("82", "Maluku Utara"),
    ("91", "Papua"),
    ("92", "Papua Barat"),
    ("93", "Papua Selatan"),
    ("94", "Papua Tengah"),
    ("95", "Papua Pegunungan"),
    ("96", "Papua Barat Daya"),
]


def upgrade() -> None:
    op.create_table(
        "provinsi",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(10), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_provinsi_code", "provinsi", ["code"], unique=True)

    bind = op.get_bind()
    for code, name in DATA:
        bind.execute(
            sa.text("INSERT INTO provinsi (code, name) VALUES (:c, :n)"),
            {"c": code, "n": name},
        )


def downgrade() -> None:
    op.drop_index("ix_provinsi_code", table_name="provinsi")
    op.drop_table("provinsi")
