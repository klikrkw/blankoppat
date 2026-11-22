"""seed data gelar umum

Data awal master gelar yang sering dipakai pada dokumen PPAT/Notaris.
Seed bersifat idempotent: singkatan yang sudah ada tidak ditambahkan lagi.

Revision ID: 0049_seed_gelar
Revises: 0048_gelar
Create Date: 2026-11-22
"""
import sqlalchemy as sa
from alembic import op

revision = "0049_seed_gelar"
down_revision = "0048_gelar"
branch_labels = None
depends_on = None

GELAR = [
    ("Dr.", "Doktor"),
    ("Drs.", "Doktorandus"),
    ("Dra.", "Doktoranda"),
    ("Prof.", "Profesor"),
    ("Ir.", "Insinyur"),
    ("drg.", "Dokter Gigi"),
    ("Ns.", "Ners"),
    ("Apt.", "Apoteker"),
    ("A.Md.", "Ahli Madya"),
    ("S.H.", "Sarjana Hukum"),
    ("M.H.", "Magister Hukum"),
    ("M.Kn.", "Magister Kenotariatan"),
    ("S.H.I.", "Sarjana Hukum Islam"),
    ("M.H.I.", "Magister Hukum Islam"),
    ("S.T.", "Sarjana Teknik"),
    ("M.T.", "Magister Teknik"),
    ("S.Tr.", "Sarjana Terapan"),
    ("M.Tr.", "Magister Terapan"),
    ("S.E.", "Sarjana Ekonomi"),
    ("M.M.", "Magister Manajemen"),
    ("S.Sos.", "Sarjana Sosial"),
    ("M.Si.", "Magister Sains"),
    ("S.Pd.", "Sarjana Pendidikan"),
    ("M.Pd.", "Magister Pendidikan"),
    ("S.Kom.", "Sarjana Komputer"),
    ("M.Kom.", "Magister Komputer"),
    ("S.Ag.", "Sarjana Agama"),
    ("M.Ag.", "Magister Agama"),
    ("S.Psi.", "Sarjana Psikologi"),
    ("M.Psi.", "Magister Psikologi"),
    ("S.Ked.", "Sarjana Kedokteran"),
    ("S.Kep.", "Sarjana Keperawatan"),
    ("M.Kep.", "Magister Keperawatan"),
    ("S.Farm.", "Sarjana Farmasi"),
    ("S.IP.", "Sarjana Ilmu Politik"),
    ("M.IP.", "Magister Ilmu Politik"),
    ("S.AP.", "Sarjana Administrasi Publik"),
    ("M.AP.", "Magister Administrasi Publik"),
    ("S.S.", "Sarjana Sastra"),
    ("M.Hum.", "Magister Humaniora"),
    ("S.Fil.", "Sarjana Filsafat"),
    ("M.Fil.", "Magister Filsafat"),
    ("S.Si.", "Sarjana Sains"),
    ("M.Sc.", "Master of Science"),
    ("Ph.D.", "Doctor of Philosophy"),
    ("S.Ars.", "Sarjana Arsitektur"),
    ("M.Ars.", "Magister Arsitektur"),
    ("S.Ds.", "Sarjana Desain"),
    ("M.Ds.", "Magister Desain"),
    ("S.Pt.", "Sarjana Peternakan"),
    ("S.Kel.", "Sarjana Kelautan"),
    ("S.AB.", "Sarjana Administrasi Bisnis"),
    ("M.AB.", "Magister Administrasi Bisnis"),
    ("S.Th.", "Sarjana Teologi"),
    ("M.Th.", "Magister Teologi"),
]


def upgrade() -> None:
    bind = op.get_bind()
    if "gelar" not in set(sa.inspect(bind).get_table_names()):
        return
    for singkatan, kepanjangan in GELAR:
        exists = bind.execute(
            sa.text("SELECT id FROM gelar WHERE LOWER(singkatan) = LOWER(:s)"),
            {"s": singkatan},
        ).first()
        if exists:
            continue
        bind.execute(
            sa.text(
                "INSERT INTO gelar (singkatan, kepanjangan) VALUES (:s, :k)"
            ),
            {"s": singkatan, "k": kepanjangan},
        )


def downgrade() -> None:
    bind = op.get_bind()
    if "gelar" not in set(sa.inspect(bind).get_table_names()):
        return
    for singkatan, _ in GELAR:
        bind.execute(
            sa.text("DELETE FROM gelar WHERE LOWER(singkatan) = LOWER(:s)"),
            {"s": singkatan},
        )
