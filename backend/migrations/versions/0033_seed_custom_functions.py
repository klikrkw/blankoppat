"""seed custom functions — fungsi siap pakai untuk template

Revision ID: 0033_seed_custom_functions
Revises: 0032_system_setting_users
Create Date: 2026-11-13
"""
import json

import sqlalchemy as sa
from alembic import op

revision = "0033_seed_custom_functions"
down_revision = "0032_system_setting_users"
branch_labels = None
depends_on = None

FUNCTIONS = [
    {
        "name": "panggilan_lengkap",
        "description": "Sebutan + nama pihak (mis. Tuan SUYATNO)",
        "parameters": ["pihak"],
        "implementation": "{{sebutan($1.jenis_kelamin, $1.status_perkawinan)}} {{$1.nama}}",
    },
    {
        "name": "pihak_satu_baris",
        "description": "Sebutan, nama, dan NIK dalam satu baris",
        "parameters": ["pihak"],
        "implementation": "{{sebutan($1.jenis_kelamin, $1.status_perkawinan)}} {{$1.nama}} (NIK {{$1.nik}})",
    },
    {
        "name": "tanggal_indo",
        "description": "Format tanggal Indonesia (DD MMMM YYYY)",
        "parameters": ["tanggal"],
        "implementation": '{{format_date($1, "DD MMMM YYYY")}}',
    },
    {
        "name": "rupiah",
        "description": "Format angka menjadi Rupiah",
        "parameters": ["angka"],
        "implementation": "{{currency($1, 'IDR')}}",
    },
    {
        "name": "terbilang_rupiah",
        "description": "Angka menjadi terbilang dengan satuan rupiah",
        "parameters": ["angka"],
        "implementation": "{{terbilang($1, 'rupiah')}}",
    },
    {
        "name": "singkat_kota",
        "description": "Gabung desa dan kecamatan",
        "parameters": ["desa", "kecamatan"],
        "implementation": "{{concat($1, ', ', $2)}}",
    },
    {
        "name": "obyek_singkat",
        "description": "Ringkasan objek: jenis, nomor hak, atas nama",
        "parameters": ["obyek"],
        "implementation": "{{concat($1.jenis_sertipikat, ' No. ', $1.nomor_hak, ' a.n. ', $1.atas_nama)}}",
    },
]


def upgrade() -> None:
    conn = op.get_bind()
    for item in FUNCTIONS:
        exists = conn.execute(
            sa.text("SELECT id FROM functions WHERE name = :name"), {"name": item["name"]}
        ).first()
        if exists:
            continue
        conn.execute(
            sa.text(
                "INSERT INTO functions (name, code, description, parameters, implementation, return_type, is_active) "
                "VALUES (:name, :code, :description, :parameters, :implementation, :return_type, :is_active)"
            ),
            {
                "name": item["name"],
                "code": item["name"].upper(),
                "description": item["description"],
                "parameters": json.dumps(item["parameters"]),
                "implementation": item["implementation"],
                "return_type": "text",
                "is_active": True,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    for item in FUNCTIONS:
        conn.execute(sa.text("DELETE FROM functions WHERE name = :name"), {"name": item["name"]})
