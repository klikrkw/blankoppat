"""seed pekerjaan — data master pekerjaan standar

Revision ID: 0025_seed_pekerjaan
Revises: 0024_uraian_unique
Create Date: 2026-10-31
"""
import sqlalchemy as sa
from alembic import op

revision = "0025_seed_pekerjaan"
down_revision = "0024_uraian_unique"
branch_labels = None
depends_on = None

PEKERJAAN = [
    "Belum/Tidak Bekerja",
    "Mengurus Rumah Tangga",
    "Pelajar/Mahasiswa",
    "Pensiunan",
    "Aparatur Sipil Negara (ASN)",
    "Tentara Nasional Indonesia (TNI)",
    "Kepolisian RI (POLRI)",
    "Perdagangan",
    "Petani/Pekebun",
    "Peternak",
    "Nelayan/Perikanan",
    "Industri",
    "Konstruksi",
    "Transportasi",
    "Karyawan Swasta",
    "Karyawan BUMN",
    "Karyawan BUMD",
    "Karyawan Honorer",
    "Buruh Harian Lepas",
    "Buruh Tani/Perkebunan",
    "Buruh Nelayan/Perikanan",
    "Buruh Peternakan",
    "Pembantu Rumah Tangga",
    "Tukang Cukur",
    "Tukang Listrik",
    "Tukang Batu",
    "Tukang Kayu",
    "Tukang Sol Sepatu",
    "Tukang Las/Pandai Besi",
    "Tukang Jahit",
    "Tukang Gigi",
    "Penata Rias",
    "Penata Busana",
    "Penata Rambut",
    "Mekanik",
    "Seniman",
    "Tabib",
    "Paraji",
    "Perancang Busana",
    "Penerjemah",
    "Imam Masjid",
    "Pendeta",
    "Pastor",
    "Wartawan",
    "Ustaz/Mubalig",
    "Juru Masak",
    "Promotor Acara",
    "Anggota DPR-RI",
    "Anggota DPD",
    "Anggota BPK",
    "Presiden",
    "Wakil Presiden",
    "Anggota Mahkamah Konstitusi",
    "Anggota Kabinet/Kementerian",
    "Duta Besar/Kepala Perwakilan",
    "Gubernur",
    "Wakil Gubernur",
    "Bupati",
    "Wakil Bupati",
    "Wali Kota",
    "Wakil Wali Kota",
    "Anggota DPRD Provinsi",
    "Anggota DPRD Kabupaten/Kota",
    "Dosen",
    "Guru",
    "Pilot",
    "Pengacara",
    "Notaris",
    "Arsitek",
    "Akuntan",
    "Konsultan",
    "Dokter",
    "Bidan",
    "Perawat",
    "Apoteker",
    "Psikiater/Psikolog",
    "Penyiar Televisi",
    "Penyiar Radio",
    "Pelaut",
    "Peneliti",
    "Sopir",
    "Pialang",
    "Paranormal",
    "Pedagang",
    "Perangkat Desa",
    "Kepala Desa",
    "Biarawati",
    "Wiraswasta",
    "Anggota Lembaga Tinggi Lainnya",
    "Artis",
    "Atlet",
    "Chef",
    "Manajer",
    "Tenaga Tata Usaha",
    "Operator",
    "Pekerja Pengolahan, Kerajinan",
    "Teknisi",
    "Asisten Ahli",
    "Lainnya",
    "Gembala",
    "Uskup",
    "Biarawan",
    "Pandita",
    "Pinandita",
    "Bhikkhu",
    "Xueshi",
    "Wenshi",
    "Jiaosheng",
]


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("TRUNCATE TABLE pekerjaan"))
    if PEKERJAAN:
        conn.execute(
            sa.text("INSERT INTO pekerjaan (nama_pekerjaan) VALUES (:nama)"),
            [{"nama": nama} for nama in PEKERJAAN],
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("TRUNCATE TABLE pekerjaan"))
