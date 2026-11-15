"""seed custom function ektp_paragraph

Revision ID: 0021_seed_ektp_paragraph
Revises: 0020_wilayah_kode_unique
Create Date: 2026-10-29
"""
import json

import sqlalchemy as sa
from alembic import op

revision = "0021_seed_ektp_paragraph"
down_revision = "0020_wilayah_kode_unique"
branch_labels = None
depends_on = None

NAME = "ektp_paragraph"
PARAMETERS = [
    "jenis_kelamin",
    "status_perkawinan",
    "nama",
    "tempat_lahir",
    "tanggal_lahir",
    "pekerjaan",
    "desa",
    "rt",
    "rw",
    "kecamatan",
    "kabupaten",
    "nik",
]
IMPLEMENTATION = (
    '{{sebutan($1.jenis_kelamin, $1.status_perkawinan)}} {{$1.nama}}, '
    'lahir di {{$1.tempat_lahir}}, pada tanggal '
    '{{format_date($1.tanggal_lahir, "DD-MM-YYYY")}} '
    '({{terbilang_tanggal($1.tanggal_lahir)}}), Warga Negara Indonesia, '
    '{{$1.pekerjaan}}, bertempat tinggal di Desa {{$1.wilayah.desa}} '
    'Rukun Tetangga {{$1.rt}}, Rukun Warga {{$1.rw}}, '
    'Kecamatan {{$1.wilayah.kecamatan}}, {{$1.wilayah.kabupaten}}, '
    'pemegang Kartu Tanda Penduduk Nomor : {{$1.nik}}'
)


def upgrade() -> None:
    conn = op.get_bind()
    exists = conn.execute(
        sa.text("SELECT id FROM functions WHERE name = :name"), {"name": NAME}
    ).first()
    if exists:
        return
    conn.execute(
        sa.text(
            "INSERT INTO functions (name, code, description, parameters, implementation, return_type, is_active) "
            "VALUES (:name, :code, :description, :parameters, :implementation, :return_type, :is_active)"
        ),
        {
            "name": NAME,
            "code": NAME.upper(),
            "description": "Format data e-KTP menjadi paragraf pihak",
            "parameters": json.dumps(PARAMETERS),
            "implementation": IMPLEMENTATION,
            "return_type": "text",
            "is_active": True,
        },
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text("DELETE FROM functions WHERE name = :name"), {"name": NAME}
    )
