"""template content — konten teks template untuk preview & generate

Revision ID: 0003_template_content
Revises: 0002_seed
Create Date: 2026-10-10

Konten teks digunakan sebagai pengganti file DOCX untuk demo.
Di produksi, konten dibaca dari file .docx melalui template_versions.
"""
import sqlalchemy as sa
from alembic import op

revision = "0003_template_content"
down_revision = "0002_seed"
branch_labels = None
depends_on = None

AJB = """AKTA JUAL BELI
Nomor: {{custom.nomor_akta}}

Pada hari {{format_date(custom.tanggal_akta, "dddd")}},
tanggal {{terbilang_tanggal(custom.tanggal_akta)}},

telah hadir:

Nama              : {{penjual[0].nama}}
NIK               : {{penjual[0].nik}}
Tempat/Tgl Lahir  : {{penjual[0].tempat_lahir}}, {{format_date(penjual[0].tanggal_lahir, "DD MMMM YYYY")}}
Pekerjaan         : {{penjual[0].pekerjaan}}
Alamat            : {{penjual[0].alamat}}

Selanjutnya disebut PIHAK PERTAMA.

dan

Nama              : {{pembeli[0].nama}}
NIK               : {{pembeli[0].nik}}
Tempat/Tgl Lahir  : {{pembeli[0].tempat_lahir}}, {{format_date(pembeli[0].tanggal_lahir, "DD MMMM YYYY")}}
Pekerjaan         : {{pembeli[0].pekerjaan}}
Alamat            : {{pembeli[0].alamat}}

Selanjutnya disebut PIHAK KEDUA.

Objek tanah:

Jenis Hak         : {{obyek.jenishak.nama_jenishak}}
Nomor Hak         : {{obyek.nomor_hak}}
Luas Tanah        : {{format_number(obyek.luas_tanah)}} m2
Letak             : {{obyek.letak.nama_desa}}
NIB               : {{obyek.nib}}

Harga transaksi sebesar:

{{currency(custom.harga_transaksi, "IDR")}}

atau

{{terbilang(custom.harga_transaksi, "rupiah")}}

Demikian akta ini dibuat di hadapan PPAT.
"""

AHB = """AKTA HIBAH
Nomor: {{custom.nomor_akta}}

Yang bertanda tangan di bawah ini:

Nama  : {{penjual[0].nama}}
NIK   : {{penjual[0].nik}}

Selanjutnya disebut PEMBERI HIBAH, dan

Nama  : {{pembeli[0].nama}}
NIK   : {{pembeli[0].nik}}

Selanjutnya disebut PENERIMA HIBAH.

Menghibahkan sebidang tanah:

Jenis Hak : {{obyek.jenishak.nama_jenishak}}
Nomor Hak : {{obyek.nomor_hak}}
Luas      : {{format_number(obyek.luas_tanah)}} m2
Letak     : {{obyek.letak.nama_desa}}

Nilai hibah: {{currency(custom.harga_transaksi, "IDR")}}
Terbilang  : {{terbilang(custom.harga_transaksi, "rupiah")}}
"""

APHT = """AKTA PEMBERIAN HAK TANGGUNGAN
Nomor: {{custom.nomor_akta}}

{{pembeli[0].nama}} memberikan hak tanggungan atas tanah:

Nomor Hak : {{obyek.nomor_hak}}
Jenis Hak : {{obyek.jenishak.nama_jenishak}}
Letak     : {{obyek.letak.nama_desa}}

Kepada {{penjual[0].nama}} sebesar:

{{currency(custom.harga_transaksi, "IDR")}}
({{terbilang(custom.harga_transaksi, "rupiah")}})
"""

SKMHT = """SURAT KUASA MEMBEBANKAN HAK TANGGUNGAN
Nomor: {{custom.nomor_akta}}

Yang bertanda tangan di bawah ini:

Nama  : {{penjual[0].nama}}
NIK   : {{penjual[0].nik}}

Memberikan kuasa kepada {{pembeli[0].nama}} untuk membebankan hak tanggungan
atas tanah Nomor Hak {{obyek.nomor_hak}}, {{obyek.jenishak.nama_jenishak}},
luas {{format_number(obyek.luas_tanah)}} m2, terletak di {{obyek.letak.nama_desa}}.
"""

SPRN = """SURAT PERNYATAAN

Yang bertanda tangan di bawah ini:

Nama  : {{penjual[0].nama}}
NIK   : {{penjual[0].nik}}
Alamat: {{penjual[0].alamat}}

Menyatakan bahwa tanah dengan Nomor Hak {{obyek.nomor_hak}} atas nama
{{obyek.atas_nama}} adalah benar miliknya dan tidak dalam sengketa.

Demikian pernyataan ini dibuat dengan sebenar-benarnya.

Jepara, {{tanggal_huruf(today())}}
"""

TTRM = """TANDA TERIMA

Telah diterima dari {{pembeli[0].nama}} sejumlah:

{{currency(custom.harga_transaksi, "IDR")}}

({{terbilang(custom.harga_transaksi, "rupiah")}})

untuk pembayaran objek tanah Nomor Hak {{obyek.nomor_hak}}.

Jepara, {{tanggal_huruf(today())}}
"""

CONTENTS = {
    "AJB": AJB,
    "AHB": AHB,
    "APHT": APHT,
    "SKMHT": SKMHT,
    "SPRN": SPRN,
    "TTRM": TTRM,
}


def upgrade() -> None:
    bind = op.get_bind()
    try:
        op.add_column("templates", sa.Column("content", sa.Text(), nullable=True))
    except Exception:
        # kolom sudah ada (misal DB sqlite lama) — lanjutkan
        pass
    for code, content in CONTENTS.items():
        bind.execute(
            sa.text("UPDATE templates SET content = :c WHERE code = :code"),
            {"c": content, "code": code},
        )


def downgrade() -> None:
    op.drop_column("templates", "content")
