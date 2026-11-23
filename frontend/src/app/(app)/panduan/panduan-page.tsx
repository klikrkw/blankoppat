"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  FileText,
  Layers,
  ListChecks,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FieldItem = { path: string; desc: string; example?: string };
type FieldGroup = { title: string; description: string; items: FieldItem[] };
type FunctionItem = { name: string; desc: string; example: string };

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: "Transaksi",
    description: "Data utama transaksi yang sedang dibuat.",
    items: [
      { path: "transaksi.nomor_transaksi", desc: "Nomor transaksi", example: "02/X/2026" },
      { path: "transaksi.tanggal_transaksi", desc: "Tanggal transaksi (YYYY-MM-DD)" },
      { path: "transaksi.judul", desc: "Judul transaksi" },
      {
        path: "transaksi.jenistransaksi.nama_jenistransaksi",
        desc: "Nama jenis transaksi",
        example: "Jual Beli",
      },
    ],
  },
  {
    title: "Pihak",
    description: "Data pihak hasil relasi e-KTP. Pihak dapat memiliki induk (parent) dan child; gunakan `#each` untuk daftar.",
    items: [
      { path: "pihak", desc: "Semua pihak (list) dengan field role & sebutan" },
      { path: "pihak.PELEPAS", desc: "Alias role: sama dengan peran.PELEPAS (bisa juga pihak.PENERIMA_KUASA, dst.)", example: "{{#if pihak.PELEPAS and pihak.PENERIMA_KUASA}}...{{/if}}" },
      { path: "penjual", desc: "Pihak berperan PENJUAL / PELEPAS (list)" },
      { path: "pembeli", desc: "Pihak berperan PEMBELI / PENERIMA (list)" },
      { path: "saksi", desc: "Pihak berperan lain, mis. SAKSI (list)" },
      { path: "peran.PENJUAL", desc: "Daftar pihak dengan role tertentu (uppercase)" },
      { path: "peran.PEMBELI", desc: "Pihak berperan PEMBELI" },
      { path: "peran.SAKSI", desc: "Pihak berperan SAKSI" },
      { path: "peran.PELEPAS", desc: "Pihak berperan PELEPAS hak" },
      { path: "peran.PELEPAS + PENERIMA_KUASA", desc: "Boleh dipakai bersamaan; keduanya daftar terpisah", example: "{{#if peran.PELEPAS and peran.PENERIMA_KUASA}}...{{/if}}" },
      { path: "peran.PENERIMA", desc: "Pihak berperan PENERIMA hak" },
      { path: "peran.PEMBERI_KUASA", desc: "Pihak berperan PEMBERI KUASA" },
      { path: "peran.PENERIMA_KUASA", desc: "Pihak berperan PENERIMA KUASA" },
      { path: "peran.PERSETUJUAN", desc: "Pihak berperan PERSETUJUAN (mis. suami/isteri)" },
      { path: "p.parent", desc: "Objek pihak induk (parent) dari item loop", example: "{{#each peran.PENERIMA as p}}{{p.parent.nama}}{{/each}}" },
      { path: "p.parent.parent.nama", desc: "Parent bertingkat (kakek/nenek relasi)", example: "{{p.parent.parent.nama}}" },
      { path: "p.children", desc: "Daftar child (per orang / e-KTP). Satu pihak multi e-KTP tetap dirinci", example: "{{#each p.children as c}}{{ektp_paragraph(c)}}{{/each}}" },
      { path: "p.has_children", desc: "True jika pihak memiliki child/anak", example: "{{#if p.has_children}}ADA ANAK{{/if}}" },
      { path: "p.has_parent", desc: "True jika pihak memiliki parent/induk", example: "{{#if p.has_parent}}ADA PARENT{{/if}}" },
      { path: "c.roles", desc: "Semua role child tersebut (mis. PELEPAS dan PEMBERI_KUASA)", example: "{{#if c.roles contains 'PEMBERI_KUASA'}}...{{/if}}" },
      { path: "p.children[0].nama", desc: "Child pertama", example: "{{p.children[0].nama}}" },
    ],
  },
  {
    title: "Field di dalam #each",
    description: "Dipakai di dalam blok loop, baik langsung maupun lewat alias.",
    items: [
      { path: "this", desc: "Objek item aktif", example: "{{ektp_paragraph(this)}}" },
      { path: "index", desc: "Nomor urut item (mulai 1)", example: "{{index}}. {{nama}}" },
      { path: "nama", desc: "Nama sesuai e-KTP" },
      { path: "nik", desc: "NIK 16 digit" },
      { path: "jenis_kelamin", desc: "LAKI-LAKI / PEREMPUAN" },
      { path: "status_perkawinan", desc: "BELUM KAWIN / KAWIN / CERAI HIDUP / CERAI MATI" },
      { path: "tempat_lahir", desc: "Tempat lahir" },
      { path: "tanggal_lahir", desc: "Tanggal lahir (YYYY-MM-DD)" },
      { path: "pekerjaan", desc: "Pekerjaan" },
      { path: "agama", desc: "Agama" },
      { path: "kewarganegaraan", desc: "Kewarganegaraan" },
      { path: "alamat", desc: "Alamat" },
      { path: "rt", desc: "RT" },
      { path: "rw", desc: "RW" },
      { path: "wilayah.desa", desc: "Desa / kelurahan" },
      { path: "wilayah.tipe_desa", desc: "Tipe desa (Desa/Kelurahan)" },
      { path: "wilayah.kecamatan", desc: "Kecamatan" },
      { path: "wilayah.kabupaten", desc: "Kabupaten / kota" },
      { path: "wilayah.tipe_kabupaten", desc: "Tipe kabupaten (Kabupaten/Kota)" },
      { path: "wilayah.provinsi", desc: "Provinsi" },
      { path: "p.nama", desc: "Contoh alias: `#each peran.PENJUAL as p`" },
    ],
  },
  {
    title: "Objek Tanah",
    description: "Data objek tanah yang dipilih pada transaksi.",
    items: [
      { path: "obyek.nomor_hak", desc: "Nomor hak" },
      { path: "obyek.persil", desc: "Persil" },
      { path: "obyek.klas", desc: "Klas" },
      { path: "obyek.luas_tanah", desc: "Luas tanah (m²)" },
      { path: "obyek.luas_bangunan", desc: "Luas bangunan (m²)" },
      { path: "obyek.atas_nama", desc: "Atas nama" },
      { path: "obyek.jenis_sertipikat", desc: "Jenis sertipikat: analog / elektronik" },
      { path: "obyek.penggunaan", desc: "Penggunaan" },
      { path: "obyek.no_surat_ukur", desc: "Nomor surat ukur" },
      { path: "obyek.tanggal_surat_ukur", desc: "Tanggal surat ukur" },
      { path: "obyek.nib", desc: "NIB" },
      { path: "obyek.nop", desc: "NOP (Nomor Objek Pajak)" },
      { path: "obyek.batas_utara", desc: "Batas utara" },
      { path: "obyek.batas_timur", desc: "Batas timur" },
      { path: "obyek.batas_selatan", desc: "Batas selatan" },
      { path: "obyek.batas_barat", desc: "Batas barat" },
      { path: "obyek.jenishak.nama_jenishak", desc: "Nama jenis hak" },
      { path: "obyek.edisi.nama_edisi", desc: "Nama edisi objek" },
      { path: "obyek.wilayah.desa", desc: "Desa objek" },
      { path: "obyek.wilayah.tipe_desa", desc: "Tipe desa objek (Desa/Kelurahan)" },
      { path: "obyek.wilayah.kecamatan", desc: "Kecamatan objek" },
      { path: "obyek.wilayah.kabupaten", desc: "Kabupaten objek" },
      { path: "obyek.wilayah.tipe_kabupaten", desc: "Tipe kabupaten objek (Kabupaten/Kota)" },
      { path: "obyek.wilayah.provinsi", desc: "Provinsi objek" },
      { path: "obyek.provinsi", desc: "Alias datar: provinsi objek" },
      { path: "obyek.kabupaten", desc: "Alias datar: kabupaten objek" },
      { path: "obyek.tipe_kabupaten", desc: "Alias datar: tipe kabupaten objek" },
      { path: "obyek.kecamatan", desc: "Alias datar: kecamatan objek" },
      { path: "obyek.desa", desc: "Alias datar: desa objek" },
      { path: "obyek.tipe_desa", desc: "Alias datar: tipe desa objek" },
      { path: "jenishak.nama_jenishak", desc: "Alias jenis hak" },
      { path: "letak.desa", desc: "Alias wilayah objek" },
      { path: "letak.tipe_kabupaten", desc: "Alias tipe kabupaten objek" },
      { path: "wilayah.desa", desc: "Alias wilayah objek" },
      { path: "wilayah.tipe_desa", desc: "Alias tipe desa objek (Desa/Kelurahan)" },
      { path: "wilayah.tipe_kabupaten", desc: "Alias tipe kabupaten objek (Kabupaten/Kota)" },
    ],
  },
  {
    title: "Sections",
    description: "Bagian transaksi (item + uraian + detail). Satu transaksi bisa punya banyak section.",
    items: [
      { path: "sections", desc: "Daftar section (list)", example: "{{#each sections}}{{nama_item}}: {{detail}}{{/each}}" },
      { path: "sections_by_name.<Nama Item>", desc: "Detail section berdasarkan nama item", example: "{{sections_by_name.Luas Tanah}}" },
      { path: "section('Nama Item')", desc: "Fungsi ambil detail section", example: "{{section('Luas Tanah')}}" },
      { path: "section_contains('Nama Item')", desc: "Cek apakah ada section dengan nama item (true/false) untuk #if", example: "{{#if section_contains('Luas Tanah')}}ADA{{/if}}" },
      { path: "section_contains('Nama Item', 'ROLE')", desc: "Cek section khusus pihak berdasarkan role", example: "{{#if section_contains('Kuasa', 'PENERIMA_KUASA')}}ADA{{/if}}" },
      { path: "section_short('Nama Item')", desc: "Fungsi ambil short text section (terisi dari isi singkat uraian)", example: "{{section_short('Luas Tanah')}}" },
      { path: "section('Nama Item', 'ROLE')", desc: "Ambil section khusus pihak berdasarkan role", example: "{{section('Kuasa', 'PENERIMA_KUASA')}}" },
      { path: "section('Nama Item', p)", desc: "Ambil section milik pihak di dalam loop (lebih akurat)", example: "{{#each peran.PELEPAS as p}}{{section('Kuasa', p)}}{{/each}}" },
      { path: "section_short('Nama Item', 'ROLE')", desc: "Short text section khusus pihak", example: "{{section_short('Kuasa', 'PENERIMA_KUASA')}}" },
      { path: "sections_by_party.<ROLE>.<Nama Item>", desc: "Peta section per role", example: "{{sections_by_party.PELEPAS.Kuasa}}" },
      { path: "pihak_id / nama_pihak", desc: "Data pihak pada item section (di dalam #each sections)" },
      { path: "nama_item", desc: "Nama item (di dalam #each sections)" },
      { path: "detail", desc: "Detail section (di dalam #each sections)" },
      { path: "nama_uraian", desc: "Nama uraian section (di dalam #each sections)" },
    ],
  },
  {
    title: "Custom Field",
    description: "Field dinamis pada transaksi (menu Dynamic Field).",
    items: [
      { path: "custom.<nama_field>", desc: "Nilai field dinamis", example: "{{custom.harga_transaksi}}" },
      { path: "custom.<multiselect>", desc: "Multi select digabung dengan koma", example: "{{custom.fasilitas}}" },
      { path: "#each custom.<multiselect>", desc: "Loop tiap pilihan multi select", example: "{{#each custom.fasilitas}}- {{this}}\n{{/each}}" },
      { path: "custom.nomor_akta", desc: "Nomor akta (fallback ke nomor transaksi)" },
      { path: "custom.tanggal_akta", desc: "Tanggal akta (fallback ke tanggal transaksi)" },
    ],
  },
  {
    title: "Uraian",
    description: "Master uraian teks (menu Data → Uraian).",
    items: [
      { path: "uraian.<Nama Uraian>", desc: "Isi uraian memakai nama asli", example: "{{uraian.Uraian Jual Beli}}" },
      { path: "uraian.<slug>", desc: "Isi uraian memakai slug", example: "{{uraian.uraian_jual_beli}}" },
      { path: "uraian('Nama')", desc: "Lewat fungsi, aman untuk nama bertitik", example: "{{uraian('Uraian Jual Beli')}}" },
      { path: "uraian('Nama', arg1, arg2)", desc: "Uraian berparameter; isi uraian pakai {{param}} atau $1", example: "{{uraian('Persetujuan', pihak.nama, pihak.nik)}}" },
      { path: "uraian_singkat('Nama', arg1, arg2)", desc: "Isi singkat uraian, parameter sama seperti uraian()", example: "{{uraian_singkat('Persetujuan', pihak.nama)}}" },
    ],
  },
  {
    title: "Staff",
    description: "Data staff (menu Data → Staff) yang menghubungkan e-KTP dengan job.",
    items: [
      { path: "staff.<Nama Job>", desc: "Staff pertama pada job tersebut (objek lengkap e-KTP)", example: "{{staff.PPAT.nama}}" },
      { path: "staff.<slug>", desc: "Sama, memakai slug nama job", example: "{{staff.kepala_kantor.nama}}" },
      { path: "staff_by_job.<Nama Job>", desc: "Daftar semua staff pada job (pakai #each). Nama job berspasi memakai slug.", example: "{{#each staff_by_job.kepala_kantor}}{{nama}};{{/each}}" },
      { path: "staff('Nama Job')", desc: "Lewat fungsi, aman untuk nama job berspasi/titik", example: "{{staff('Kepala Kantor').nama}}" },
      { path: "staff('Nama Job', 'field')", desc: "Ambil field tertentu", example: "{{staff('PPAT', 'jabatan')}}" },
    ],
  },
  {
    title: "Sistem / Kantor",
    description: "Data kantor dari menu Settings.",
    items: [
      { path: "system.company_name", desc: "Nama kantor / PPAT" },
      { path: "system.address", desc: "Alamat kantor" },
      { path: "system.email", desc: "Email kantor" },
      { path: "system.phone", desc: "Telepon kantor" },
      { path: "system.postal_code", desc: "Kode pos" },
      { path: "system.permit_number", desc: "Nomor SK / izin" },
      { path: "system.permit_date", desc: "Tanggal SK / izin" },
      { path: "system.daerah_kerja", desc: "Daerah kerja PPAT" },
      { path: "system.ektp.nama", desc: "Nama PPAT/Notaris dari e-KTP yang dipilih di Settings", example: "{{system.ektp.nama}}" },
      { path: "system.ektp.nik", desc: "NIK PPAT/Notaris", example: "{{system.ektp.nik}}" },
      { path: "system.ektp.alamat", desc: "Alamat PPAT/Notaris (lengkap dengan RT/RW dan wilayah)", example: "{{system.ektp.alamat}}" },
      { path: "system.ektp.pekerjaan", desc: "Pekerjaan PPAT/Notaris", example: "{{system.ektp.pekerjaan}}" },
      { path: "system.ektp.wilayah.desa", desc: "Wilayah e-KTP — desa/kelurahan", example: "{{system.ektp.wilayah.desa}}" },
      { path: "system.ektp.wilayah.kecamatan", desc: "Wilayah e-KTP — kecamatan", example: "{{system.ektp.wilayah.kecamatan}}" },
      { path: "system.ektp.wilayah.kabupaten", desc: "Wilayah e-KTP — kabupaten/kota", example: "{{system.ektp.wilayah.kabupaten}}" },
      { path: "system.ektp.wilayah.provinsi", desc: "Wilayah e-KTP — provinsi", example: "{{system.ektp.wilayah.provinsi}}" },
      { path: "system.users", desc: "Seluruh user aktif (list)", example: "{{#each system.users}}{{name}};{{/each}}" },
      { path: "system.wilayah.desa", desc: "Wilayah kantor — desa/kelurahan" },
      { path: "system.wilayah.tipe_desa", desc: "Wilayah kantor — tipe desa" },
      { path: "system.wilayah.kecamatan", desc: "Wilayah kantor — kecamatan" },
      { path: "system.wilayah.kabupaten", desc: "Wilayah kantor — kabupaten/kota" },
      { path: "system.wilayah.tipe_kabupaten", desc: "Wilayah kantor — tipe kabupaten" },
      { path: "system.wilayah.provinsi", desc: "Wilayah kantor — provinsi" },
      { path: "system.wilayah_id", desc: "ID wilayah kantor" },
    ],
  },
];

const FUNCTIONS: FunctionItem[] = [
  { name: "terbilang", desc: "Angka menjadi terbilang", example: "{{terbilang(custom.harga_transaksi, 'rupiah')}}" },
  { name: "terbilang_pihak", desc: "Urutan pihak: Pertama, Kedua, Ketiga, Keempat, dst.", example: "{{terbilang_pihak(@number)}}" },
  { name: "eval", desc: "Hitung ekspresi aritmetika dengan variabel", example: "{{eval('custom.harga_transaksi * 0.05')}}" },
  { name: "gelar_panjang", desc: "Ganti singkatan gelar dengan kepanjangan dari master Gelar", example: "{{gelar_panjang(system.company_name)}}" },
  { name: "find", desc: "Cari object di dalam array object", example: "{{find(pihak, peran.PENJUAL).nama}}" },
  { name: "penerima_phb", desc: "Daftar pihak yang cocok, bernomor sesuai posisi aslinya", example: "{{penerima_phb(peran.PELEPAS, peran.PENERIMA)}}" },
  { name: "terbilang_tanggal", desc: "Tanggal menjadi terbilang", example: "{{terbilang_tanggal(custom.tanggal_akta)}}" },
  { name: "tanggal_huruf", desc: "Tanggal format huruf", example: "{{tanggal_huruf(custom.tanggal_akta)}}" },
  { name: "format_date", desc: "Format tanggal Indonesia", example: '{{format_date(custom.tanggal_akta, "DD MMMM YYYY")}}' },
  { name: "format_datetime", desc: "Format tanggal dan waktu", example: '{{format_datetime(custom.tanggal_akta, "DD MMMM YYYY HH:mm")}}' },
  { name: "format_number", desc: "Angka dengan pemisah ribuan", example: "{{format_number(obyek.luas_tanah)}}" },
  { name: "currency", desc: "Format mata uang", example: "{{currency(custom.harga_transaksi, 'IDR')}}" },
  { name: "upper", desc: "Huruf besar", example: "{{upper(pihak.nama)}}" },
  { name: "lower", desc: "Huruf kecil", example: "{{lower(pihak.nama)}}" },
  { name: "capitalize", desc: "Kapital tiap kata", example: "{{capitalize(pihak.nama)}}" },
  { name: "trim", desc: "Hapus spasi tepi", example: "{{trim(pihak.nama)}}" },
  { name: "replace", desc: "Ganti teks", example: "{{replace(pihak.nama, 'A', 'B')}}" },
  { name: "substring", desc: "Potong teks", example: "{{substring(pihak.nik, 0, 6)}}" },
  { name: "concat", desc: "Gabung teks", example: "{{concat(pihak.nama, ', ', pihak.alamat)}}" },
  { name: "default", desc: "Nilai fallback jika kosong", example: "{{default(pihak.nama, '-')}}" },
  { name: "count", desc: "Jumlah item dalam daftar", example: "{{count(peran.PENJUAL)}}" },
  { name: "has_children", desc: "Cek apakah pihak memiliki child/anak", example: "{{#if has_children(p)}}...{{/if}}" },
  { name: "has_parent", desc: "Cek apakah pihak memiliki parent/induk", example: "{{#if has_parent(p)}}...{{/if}}" },
  { name: "odd", desc: "Cek nomor ganjil untuk filter where", example: "{{#each pihak where odd(@number)}}...{{/each}}" },
  { name: "even", desc: "Cek nomor genap untuk filter where", example: "{{#each pihak where even(@number)}}...{{/each}}" },
  { name: "umur", desc: "Umur dalam tahun dari tanggal lahir", example: "{{umur(pihak.tanggal_lahir)}}" },
  { name: "sebutan", desc: "Tuan / Nona / Nyonya", example: "{{sebutan(jenis_kelamin, status_perkawinan)}}" },
  { name: "ektp_paragraph", desc: "Satu paragraf lengkap data e-KTP", example: "{{ektp_paragraph(this)}}" },
  { name: "section", desc: "Detail section berdasarkan nama item", example: "{{section('Luas Tanah')}}" },
  { name: "section_contains", desc: "Cek apakah ada section dengan nama item", example: "{{#if section_contains('Luas Tanah')}}...{{/if}}" },
  { name: "section_short", desc: "Short text section berdasarkan nama item", example: "{{section_short('Luas Tanah')}}" },
  { name: "uraian", desc: "Isi master uraian berdasarkan nama", example: "{{uraian('Uraian Jual Beli')}}" },
  { name: "uraian_singkat", desc: "Isi singkat master uraian (fallback ke isi lengkap bila kosong)", example: "{{uraian_singkat('Uraian Jual Beli')}}" },
  { name: "staff", desc: "Data staff berdasarkan nama job", example: "{{staff('PPAT').nama}}" },
  { name: "today", desc: "Tanggal hari ini", example: "{{today()}}" },
  { name: "now", desc: "Tanggal + waktu sekarang", example: "{{now()}}" },
  { name: "year", desc: "Tahun berjalan", example: "{{year()}}" },
  { name: "month", desc: "Nama bulan berjalan", example: "{{month()}}" },
];

type BlockGuideSection = {
  name: string;
  title: string;
  desc: string;
  forms?: { syntax: string; note: string }[];
  variables?: { name: string; desc: string }[];
  operators?: string;
  example: string;
};

const BLOCK_GUIDE: BlockGuideSection[] = [
  {
    name: "each",
    title: "Loop daftar — {{#each}}",
    desc: "Mengulang isi blok untuk setiap item pada daftar (list).",
    forms: [
      { syntax: "{{#each peran.PENJUAL}} ... {{/each}}", note: "Loop semua item, field diakses langsung." },
      { syntax: "{{#each peran.PENJUAL as p}} ... {{/each}}", note: "Loop dengan alias p." },
      { syntax: "{{#each peran.PENERIMA where @index>0}} ... {{/each}}", note: "Loop dengan filter kondisi." },
      { syntax: "{{#each custom.fasilitas}} ... {{/each}}", note: "Loop pilihan multi select (teks)." },
    ],
    example: `{{#each peran.PENJUAL as p}}
{{index}}. {{p.nama}} — NIK {{p.nik}}
{{/each}}`,
  },
  {
    name: "index",
    title: "Variabel indeks di dalam each",
    desc: "Dipakai untuk penomoran atau memilih item tertentu.",
    variables: [
      { name: "{{index}}", desc: "Nomor urut mulai 1 (sama dengan {{@number}})." },
      { name: "{{@number}}", desc: "Nomor urut hasil filter mulai 1." },
      { name: "{{@original_number}}", desc: "Nomor urut asli sebelum filter where (mulai 1)." },
      { name: "{{@index}}", desc: "Indeks asli mulai 0 (item pertama = 0)." },
      { name: "{{@count}}", desc: "Jumlah item (setelah filter where)." },
      { name: "{{@first}}", desc: "true pada item pertama; pakai di {{#if @first}}." },
      { name: "{{@last}}", desc: "true pada item terakhir." },
      { name: "{{this}}", desc: "Objek item aktif, mis. {{ektp_paragraph(this)}}." },
    ],
    example: `{{#each peran.PENERIMA}}
{{@number}}/{{@count}}. {{nama}}{{#if @last}} (terakhir){{/if}}
{{/each}}`,
  },
  {
    name: "if",
    title: "Kondisi — {{#if}} / {{else}} / {{else if}}",
    desc: "Menampilkan bagian dokumen hanya jika kondisi terpenuhi.",
    forms: [
      { syntax: "{{#if kondisi}} ... {{/if}}", note: "Tampilkan jika kondisi benar." },
      { syntax: "{{#if kondisi}} ... {{else}} ... {{/if}}", note: "Dua cabang." },
      { syntax: "{{#if a}} ... {{else if b}} ... {{else}} ... {{/if}}", note: "Banyak cabang." },
      { syntax: "{{#if custom.fasilitas contains 'AC'}} ... {{/if}}", note: "Cek isi multi select / teks." },
      { syntax: "{{#if pihak.roles contains 'PELEPAS' or contains 'PENERIMA_KUASA'}} ... {{/if}}", note: "Bentuk singkat: subjek contains diulang otomatis." },
      { syntax: "{{#if 'Parkir' in custom.fasilitas}} ... {{/if}}", note: "Alternatif pengecekan list." },
    ],
    operators: "Operator: ==  !=  >  <  >=  <=  contains  not contains  in  —  gabungkan dengan and / or / not dan tanda kurung ( ).",
    example: `{{#if count(peran.PENERIMA) == 1}}
Satu penerima
{{else if count(peran.PENERIMA) == 2}}
Dua penerima
{{else}}
Lebih dari dua penerima
{{/if}}`,
  },
  {
    name: "select-index",
    title: "Memilih indeks tertentu",
    desc: "Kombinasi where dan if untuk memilih item berdasarkan posisi.",
    forms: [
      { syntax: "{{#each list where @index>0}}", note: "Semua kecuali item pertama." },
      { syntax: "{{#each list where odd(@number)}}", note: "Hanya item bernomor ganjil (1, 3, 5, ...)." },
      { syntax: "{{#each list where even(@number)}}", note: "Hanya item bernomor genap (2, 4, 6, ...)." },
      { syntax: "{{#each list where @index>=1 and @index<=2}}", note: "Hanya item ke-2 dan ke-3." },
      { syntax: "{{#each list where @index==0 or @index==3}}", note: "Hanya item ke-1 dan ke-4." },
      { syntax: "{{#each list}}{{#if @index==1}} ... {{/if}}{{/each}}", note: "Cara alternatif dengan if." },
      { syntax: "{{#with list[0] as p}} ... {{/with}}", note: "Ambil satu item tanpa loop." },
    ],
    example: `{{#each peran.PENERIMA where @index>0}}
{{@number}}. {{nama}}
{{/each}}`,
  },
  {
    name: "with",
    title: "Blok konteks — {{#with}}",
    desc: "Membuka objek agar field diakses tanpa prefix; bisa juga untuk satu item.",
    forms: [
      { syntax: "{{#with obyek}} ... {{nomor_hak}} ... {{/with}}", note: "Field tanpa prefix." },
      { syntax: "{{#with peran.PENERIMA[0] as p}} ... {{p.nama}} ... {{/with}}", note: "Dengan alias." },
      { syntax: "{{#with peran.PENERIMA[0].nama}} ... {{this}} ... {{/with}}", note: "Nilai tunggal (teks/angka)." },
      { syntax: "{{#with peran.PENERIMA as p}} ... {{/with}}", note: "Jika target list → otomatis iterasi." },
    ],
    example: `{{#with obyek}}
Nomor Hak: {{nomor_hak}}
Desa: {{wilayah.desa}}
{{/with}}`,
  },
];

const BLOCK_PITFALLS = [
  "Setiap blok wajib ditutup: {{/each}}, {{/if}}, {{/with}} (boleh juga {{endeach}}, {{endif}}, {{endwith}}).",
  "Jangan menulis {{#each peran.PENERIMA[0]}} bila maksudnya mengulang semua orang — [0] mengambil satu item.",
  "if yang membungkus each harus urut: {{#if}} → {{#each}} → {{/each}} → {{/if}} (jangan menyilang).",
  "Untuk tabel Word: letakkan {{#each}} di paragraf sebelum tabel dan {{/each}} setelah tabel; placeholder di dalam sel.",
  "Gunakan {{@index}} (mulai 0) atau {{@number}}/{{index}} (mulai 1). Jangan tertukar.",
  "Setelah mengedit file .docx, unggah ulang template agar konten di database ikut diperbarui.",
  "Preview di dialog Test memakai data contoh; uji dengan data nyata lewat wizard Dokumen Baru atau hasil generate.",
];

const SNIPPETS = [
  {
    title: "Placeholder dasar",
    code: `{{transaksi.nomor_transaksi}}\n{{system.company_name}}\n{{custom.nomor_akta}}`,
  },
  {
    title: "Loop pihak dengan alias",
    code: `{{#each peran.PENJUAL as p}}\n{{sebutan(p.jenis_kelamin, p.status_perkawinan)}} {{p.nama}}, lahir di {{p.tempat_lahir}}, pada tanggal {{format_date(p.tanggal_lahir, "DD-MM-YYYY")}} ({{terbilang_tanggal(p.tanggal_lahir)}}), Warga Negara Indonesia, {{p.pekerjaan}}, bertempat tinggal di Desa {{p.wilayah.desa}} Rukun Tetangga {{p.rt}}, Rukun Warga {{p.rw}}, Kecamatan {{p.wilayah.kecamatan}}, {{p.wilayah.kabupaten}}, pemegang Kartu Tanda Penduduk Nomor : {{p.nik}};\n{{/each}}`,
  },
  {
    title: "Satu paragraf e-KTP",
    code: `{{#each peran.PENJUAL as p}}\n{{ektp_paragraph(p)}};\n{{/each}}`,
  },
  {
    title: "Nomor berurutan",
    code: `{{#each peran.PENJUAL as p}}\n{{index}}. {{p.nama}}\n{{/each}}`,
  },
  {
    title: "Kondisi jumlah pihak",
    code: `{{#if count(peran.PENJUAL) > 1}}\n{{#each peran.PENJUAL as p}}\n{{ektp_paragraph(p)}};\n{{/each}}\n{{else}}\n- {{ektp_paragraph(this)}}\n{{/if}}`,
  },
  {
    title: "Blok with (tanpa prefix)",
    code: `{{#with pihak}}\n{{sebutan(jenis_kelamin, status_perkawinan)}} {{nama}}, lahir di {{tempat_lahir}}, pada tanggal {{format_date(tanggal_lahir, "DD-MM-YYYY")}}, umur {{umur(tanggal_lahir)}} tahun, NIK {{nik}}.\n{{/with}}`,
  },
  {
    title: "Blok with dengan alias",
    code: `{{#with peran.PENERIMA[0] as p}}\n{{p.nama}} — {{p.nik}} — {{p.wilayah.desa}}\n{{/with}}\n\n{{#each peran.PENJUAL}}\n{{#with this as x}}{{x.nama}};{{/with}}\n{{/each}}`,
  },
  {
    title: "Cek parent / child pihak",
    code: `{{#each peran.PENERIMA as p}}\n{{#if has_parent(p)}}Parent: {{p.parent.nama}}{{/if}}\n{{#if has_children(p)}}\n{{#each p.children as c}}- {{c.nama}}\n{{/each}}\n{{/if}}\n{{/each}}`,
  },
  {
    title: "Kondisi multi select",
    code: `{{#if custom.fasilitas contains 'AC'}}\nAda AC\n{{else}}\nTidak ada AC\n{{/if}}\n\n{{#if custom.fasilitas not contains 'Wifi'}}Tanpa Wifi{{/if}}\n{{#if 'Parkir' in custom.fasilitas}}Ada Parkir{{/if}}\n{{#if custom.fasilitas contains 'AC' and count(custom.fasilitas) > 2}}Lengkap{{/if}}`,
  },
  {
    title: "Filter indeks dengan where",
    code: `{{#each peran.PENERIMA where @index>0}}\n{{@number}}. {{nama}}\n{{/each}}`,
  },
  {
    title: "Hanya item ganjil / genap",
    code: `{{#each pihak where odd(@number)}}\n{{@original_number}}. {{nama}}\n{{/each}}\n\n{{#each pihak where even(@number)}}\n{{@original_number}}. {{nama}}\n{{/each}}`,
  },
  {
    title: "Pilih indeks tertentu (where + if)",
    code: `{{#each peran.PENERIMA where @index>=1 and @index<=2}}\n{{@number}}. {{nama}}\n{{/each}}\n\n{{#each peran.PENJUAL}}{{#if @index==0}}PERTAMA: {{nama}}{{/if}}{{/each}}`,
  },
  {
    title: "Nomor urut & item terakhir",
    code: `{{#each peran.SAKSI}}\n{{@number}}/{{@count}}. {{nama}}{{#if @last}} (terakhir){{/if}}\n{{/each}}`,
  },
  {
    title: "Penerima: utama + daftar kuasa",
    code: `{{#with peran.PENERIMA[0] as p}}\n{{p.nama}} — {{p.nik}} — {{alamat_pihak(p)}}\n{{/with}}\n\n{{#if count(peran.PENERIMA)>1}}\nDalam hal ini bertindak selaku Kuasa dari :\n{{#each peran.PENERIMA where @index>0}}\n{{@number}}. {{nama}} — {{alamat_pihak(this)}}\n{{/each}}\n{{/if}}`,
  },
  {
    title: "Kondisi gabungan (and / or / not)",
    code: `{{#if (count(peran.PENJUAL) > 1 and count(peran.PEMBELI) > 0) or count(peran.SAKSI) > 0}}\nTampilkan bagian ini\n{{else}}\nTampilkan bagian lain\n{{/if}}`,
  },
  {
    title: "Cek beberapa role pihak",
    code: `{{#if pihak.roles contains 'PELEPAS' or contains 'PENERIMA_KUASA'}}\nPihak ini PELEPAS atau PENERIMA_KUASA\n{{/if}}`,
  },
  {
    title: "Penerima tanpa wali",
    code: `{{#if peran.PENERIMA and not peran.WALI}}\nPenerima tanpa wali\n{{else}}\nAda wali atau tidak ada penerima\n{{/if}}`,
  },
];

const WORKFLOW = [
  {
    title: "1. Lengkapi master data",
    desc: "Isi e-KTP, objek tanah, wilayah, pekerjaan, jenis hak, peran pihak, dan uraian.",
    href: "/data/ektp",
    linkLabel: "Buka Data e-KTP",
  },
  {
    title: "2. Buat template",
    desc: "Menu Template → Tambah, lalu unggah file DOCX dan isi placeholder.",
    href: "/template",
    linkLabel: "Buka Template",
  },
  {
    title: "3. Siapkan jenis transaksi & surat",
    desc: "Tautkan surat ke jenis transaksi agar dokumen otomatis tersedia saat membuat transaksi.",
    href: "/template/jenistransaksi",
    linkLabel: "Buka Jenis Transaksi",
  },
  {
    title: "4. Buat transaksi",
    desc: "Pilih jenis transaksi, objek, dan pihak (boleh multi peran). Nomor transaksi otomatis.",
    href: "/transaksi",
    linkLabel: "Buka Transaksi",
  },
  {
    title: "5. Generate & unduh dokumen",
    desc: "Generate dokumen, lalu unduh DOCX. Dokumen bisa dicetak atau diedit teksnya tanpa mengubah format.",
    href: "/dokumen",
    linkLabel: "Buka Dokumen",
  },
];

function CopyButton({ value }: { value: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Disalin ke clipboard");
    } catch {
      toast.error("Gagal menyalin");
    }
  };
  return (
    <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0" onClick={handleCopy}>
      <Copy className="size-3.5" />
    </Button>
  );
}

export default function PanduanPage() {
  const [search, setSearch] = useState("");

  const keyword = search.trim().toLowerCase();

  const filteredGroups = useMemo(
    () =>
      FIELD_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            !keyword ||
            item.path.toLowerCase().includes(keyword) ||
            item.desc.toLowerCase().includes(keyword)
        ),
      })).filter((group) => group.items.length > 0),
    [keyword]
  );

  const filteredFunctions = useMemo(
    () =>
      FUNCTIONS.filter(
        (fn) =>
          !keyword ||
          fn.name.toLowerCase().includes(keyword) ||
          fn.desc.toLowerCase().includes(keyword)
      ),
    [keyword]
  );

  return (
    <div>
      <PageHeader title="Panduan" description="Cara pakai aplikasi, membuat template, field & fungsi.">
        <Badge variant="secondary" className="gap-1">
          <FileText className="size-3.5" /> Dokumentasi
        </Badge>
      </PageHeader>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari field atau fungsi..."
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="alur">
        <TabsList className="mb-4">
          <TabsTrigger value="alur" className="gap-1.5">
            <Layers className="size-3.5" /> Alur Kerja
          </TabsTrigger>
          <TabsTrigger value="template" className="gap-1.5">
            <FileText className="size-3.5" /> Template
          </TabsTrigger>
          <TabsTrigger value="field" className="gap-1.5">
            <ListChecks className="size-3.5" /> Field
          </TabsTrigger>
          <TabsTrigger value="fungsi" className="gap-1.5">
            <Wrench className="size-3.5" /> Fungsi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alur" className="space-y-4">
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Alur penggunaan aplikasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {WORKFLOW.map((step) => (
                <div key={step.title} className="flex gap-3 rounded-lg border p-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold">{step.title}</p>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">{step.desc}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link href={step.href}>{step.linkLabel}</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
              <p>• Nomor transaksi otomatis berformat urut/bulan romawi/tahun dan reset tiap bulan.</p>
              <p>• Dokumen lama otomatis digenerate ulang saat transaksi diedit.</p>
              <p>• Satu pihak boleh punya beberapa peran (mis. PENJUAL + PEMBERI_KUASA).</p>
              <p>• Edit dokumen hanya mengubah teks; font, tabel, dan spasi tetap.</p>
              <p>• Nama uraian harus unik dan langsung bisa dipakai di template.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="template" className="space-y-4">
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Membuat template DOCX</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[12.5px] leading-relaxed">
              <ol className="list-decimal space-y-2 pl-5">
                <li>Buka menu <Link className="text-primary underline" href="/template">Template</Link> lalu klik <b>Tambah Template</b>.</li>
                <li>Isi nama, kode, kategori, dan deskripsi template.</li>
                <li>Unggah file <b>.docx</b>. Aplikasi menyimpan file asli dan mengekstrak teksnya.</li>
                <li>Tulis placeholder pada file Word memakai <code className="rounded bg-muted px-1">{"{{...}}"}</code>.</li>
                <li>Simpan, lalu gunakan template pada jenis transaksi/surat.</li>
                <li>Gunakan tombol <b>Preview</b> untuk mengecek hasil sebelum dipakai.</li>
              </ol>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-semibold">Sintaks yang didukung</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  <li><code>{"{{transaksi.nomor_transaksi}}"}</code> — placeholder biasa</li>
                  <li><code>{"{{#each peran.PENJUAL}} ... {{/each}}"}</code> — loop</li>
                  <li><code>{"{{#each peran.PENJUAL as p}}"}</code> — loop dengan alias</li>
                  <li><code>{"{{#with pihak}} ... {{/with}}"}</code> — akses field tanpa prefix</li>
                  <li><code>{"{{#with pihak as p}} ... {{/with}}"}</code> — with dengan alias</li>
                  <li><code>{"{{#if kondisi}} ... {{else}} ... {{/if}}"}</code> — kondisi</li>
                  <li><code>{"{{#if custom.field contains 'Opsi'}}"}</code> — cek multi select</li>
                  <li><code>{"{{else if kondisi}}"}</code> — kondisi bercabang</li>
                  <li><code>and</code>, <code>or</code>, <code>not</code>, kurung — logika kondisi</li>
                  <li><code>{"{{uraian('Nama Uraian')}}"}</code> — ambil master uraian</li>
                </ul>
              </div>
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                <p className="font-semibold">Menjaga format dokumen</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  <li>Format paragraf (font, indent, spasi, alignment) disalin dari file asli.</li>
                  <li>Tab stop dan numbering dipertahankan — jangan ganti dengan spasi manual.</li>
                  <li>Letakkan <code>{"{{#each}}"}</code> dan <code>{"{{/each}}"}</code> di paragraf yang sesuai dengan format item.</li>
                  <li>Untuk tabel, taruh placeholder di dalam sel agar struktur tabel tetap.</li>
                  <li>Gunakan <code>{"{{#if}}"}</code> sebelum <code>{"{{#each}}"}</code> agar cabang tidak dobel.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Menggunakan Sections</CardTitle>
              <p className="text-[12px] text-muted-foreground">
                Section menghubungkan <b>item</b> dengan <b>uraian</b>, lalu dipanggil di template.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-[12.5px] leading-relaxed">
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Buat item di menu <Link className="text-primary underline" href="/data/items">Data → Items</Link>{" "}
                  (mis. <i>Luas Tanah</i>, <i>Batas Utara</i>).
                </li>
                <li>
                  Siapkan uraian di menu <Link className="text-primary underline" href="/data/uraian">Data → Uraian</Link>{" "}
                  (opsional, bisa berparameter).
                </li>
                <li>
                  Buka <Link className="text-primary underline" href="/dokumen/baru">Dokumen Baru</Link>, isi sampai
                  langkah <b>Pihak</b>, lalu buka tab <b>Sections</b>.
                </li>
                <li>
                  Klik <b>Tambah Section</b>, pilih <b>Item</b>, <b>Uraian</b>, dan opsional <b>Pihak</b>.
                  Field <b>Detail</b> otomatis terisi dari
                  <code className="rounded bg-muted px-1">isi_uraian</code>, sedangkan <b>Short Text</b>
                  terisi dari <code className="rounded bg-muted px-1">isi_singkat</code>. Keduanya tetap bisa
                  diedit. Section tanpa pihak dipanggil lewat
                  <code className="rounded bg-muted px-1">section('Nama Item')</code>; section berpihak
                  lewat <code className="rounded bg-muted px-1">section('Nama Item', 'ROLE')</code> atau
                  <code className="rounded bg-muted px-1">section('Nama Item', p)</code> di dalam loop pihak.
                </li>
                <li>Lanjutkan ke Custom Field, pilih surat, lalu generate dokumen.</li>
              </ol>

              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-semibold">Memanggil di template Word</p>
                <div className="mt-2 space-y-2">
                  {[
                    { label: "Semua section", code: "{{#each sections}}{{nama_item}} : {{detail}}\n{{/each}}" },
                    { label: "Dengan nomor", code: "{{#each sections}}{{@number}}. {{nama_item}} : {{detail}}\n{{/each}}" },
                    { label: "Satu item (fungsi)", code: "{{section('Luas Tanah')}}" },
                    { label: "Satu item (map)", code: "{{sections_by_name.Luas Tanah}}" },
                    { label: "Dengan alias", code: "{{#each sections as s}}{{s.nama_item}} — {{s.detail}}\n{{/each}}" },
                    { label: "Kondisi", code: "{{#if section('Luas Tanah')}}Luas: {{section('Luas Tanah')}}{{else}}Luas: -{{/if}}" },
                    { label: "Section per pihak", code: "{{#each peran.PELEPAS as p}}{{section('Kuasa', p)}}{{/each}}" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-md border bg-card">
                      <div className="flex items-center justify-between border-b px-2 py-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">{item.label}</span>
                        <CopyButton value={item.code} />
                      </div>
                      <pre className="overflow-x-auto px-2 py-1.5 text-[11.5px] whitespace-pre-wrap">{item.code}</pre>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                <p className="font-semibold">Catatan</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  <li>Nama item dipakai sebagai kunci pada <code className="rounded bg-muted px-1">section()</code>, <code className="rounded bg-muted px-1">section_short()</code>, <code className="rounded bg-muted px-1">sections_by_name</code>, dan <code className="rounded bg-muted px-1">sections_by_name_short</code>.</li>
                  <li>Section dengan <b>Pihak</b> dipanggil lewat parameter kedua: role (mis. <code className="rounded bg-muted px-1">'PELEPAS'</code>) atau objek pihak di dalam <code className="rounded bg-muted px-1">#each</code>. Tersedia juga peta <code className="rounded bg-muted px-1">sections_by_party</code> dan <code className="rounded bg-muted px-1">sections_by_party_short</code>.</li>
                  <li>Saat parameter pihak berupa objek, placeholder di detail section ikut diisi data pihak, mis. <code className="rounded bg-muted px-1">{"{{nama}}"}</code>, <code className="rounded bg-muted px-1">{"{{nik}}"}</code>, <code className="rounded bg-muted px-1">{"{{alamat}}"}</code>. Jika section belum ada untuk pihak tersebut, dipakai section umum dengan nama item sama.</li>
                  <li>Ubah teks detail langsung di tab Sections tanpa mengubah master uraian.</li>
                  <li>Urutan section mengikuti urutan saat ditambahkan.</li>
                  <li>Section hanya tersedia setelah transaksi disimpan (wizard selesai di langkah surat/generate).</li>
                  <li>
                    Gunakan simbol <code className="rounded bg-muted px-1">\n</code> untuk Enter (baris baru) dan{" "}
                    <code className="rounded bg-muted px-1">\t</code> untuk Tab pada field Detail — simbol ini
                    diterjemahkan menjadi paragraf baru dan tab di dokumen Word.
                  </li>
                  <li>
                    Karena <code className="rounded bg-muted px-1">\n</code> menghasilkan paragraf baru, first-line
                    indent dan hanging indent dari paragraf template tetap berlaku pada setiap baris.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Panduan lengkap: each, if &amp; with</CardTitle>
              <p className="text-[12px] text-muted-foreground">
                Referensi sintaks blok — salin contoh dengan tombol di kanan.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {BLOCK_GUIDE.map((section) => (
                <div key={section.name} className="rounded-lg border p-3">
                  <p className="text-[13px] font-semibold">{section.title}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{section.desc}</p>

                  {section.forms && (
                    <div className="mt-2 space-y-2">
                      {section.forms.map((form) => (
                        <div key={form.syntax} className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">
                              {form.syntax}
                            </code>
                            <p className="mt-0.5 text-[11.5px] text-muted-foreground">{form.note}</p>
                          </div>
                          <CopyButton value={form.syntax} />
                        </div>
                      ))}
                    </div>
                  )}

                  {section.variables && (
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {section.variables.map((variable) => (
                        <div
                          key={variable.name}
                          className="flex items-start justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <code className="font-mono text-[11.5px] text-primary">{variable.name}</code>
                            <p className="text-[11.5px] text-muted-foreground">{variable.desc}</p>
                          </div>
                          <CopyButton value={variable.name} />
                        </div>
                      ))}
                    </div>
                  )}

                  {section.operators && (
                    <p className="mt-2 rounded-md bg-muted/40 px-2 py-1.5 text-[11.5px] text-muted-foreground">
                      {section.operators}
                    </p>
                  )}

                  <div className="mt-2 rounded-md border bg-muted/30">
                    <div className="flex items-center justify-between border-b px-2 py-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">Contoh</span>
                      <CopyButton value={section.example} />
                    </div>
                    <pre className="overflow-x-auto px-2 py-1.5 text-[11.5px] whitespace-pre-wrap">
                      {section.example}
                    </pre>
                  </div>
                </div>
              ))}

              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                <p className="text-[13px] font-semibold">Jebakan umum</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11.5px] text-muted-foreground">
                  {BLOCK_PITFALLS.map((pitfall) => (
                    <li key={pitfall}>{pitfall}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Contoh siap pakai</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {SNIPPETS.map((snippet) => (
                <div key={snippet.title} className="rounded-lg border">
                  <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                    <p className="text-[12.5px] font-semibold">{snippet.title}</p>
                    <CopyButton value={snippet.code} />
                  </div>
                  <pre className="overflow-x-auto px-3 py-2 text-[11.5px] leading-relaxed whitespace-pre-wrap">
                    {snippet.code}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="field" className="space-y-4">
          {filteredGroups.length === 0 && (
            <Card className="border shadow-none">
              <CardContent className="py-10 text-center text-[12.5px] text-muted-foreground">
                Field tidak ditemukan.
              </CardContent>
            </Card>
          )}
          {filteredGroups.map((group) => (
            <Card key={group.title} className="border shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-[14.5px]">{group.title}</CardTitle>
                <p className="text-[12px] text-muted-foreground">{group.description}</p>
              </CardHeader>
              <CardContent className="divide-y">
                {group.items.map((item) => (
                  <div key={item.path} className="flex items-start justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[12px] text-primary">{`{{${item.path}}}`}</p>
                      <p className="text-[11.5px] text-muted-foreground">{item.desc}</p>
                      {item.example && (
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {item.example}
                        </p>
                      )}
                    </div>
                    <CopyButton value={`{{${item.path}}}`} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="fungsi" className="space-y-4">
          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[14.5px]">
                <Sparkles className="size-4 text-primary" /> Fungsi bawaan
              </CardTitle>
              <p className="text-[12px] text-muted-foreground">
                Panggil di dalam placeholder, contoh <code className="rounded bg-muted px-1">{"{{upper(pihak.nama)}}"}</code>.
              </p>
            </CardHeader>
            <CardContent className="divide-y">
              {filteredFunctions.length === 0 && (
                <p className="py-6 text-center text-[12.5px] text-muted-foreground">
                  Fungsi tidak ditemukan.
                </p>
              )}
              {filteredFunctions.map((fn) => (
                <div key={fn.name} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[12px] font-semibold text-primary">{fn.name}</p>
                    <p className="text-[11.5px] text-muted-foreground">{fn.desc}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{fn.example}</p>
                  </div>
                  <CopyButton value={fn.example} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14.5px]">Urutan pihak — terbilang_pihak()</CardTitle>
              <p className="text-[12px] text-muted-foreground">
                Mengubah angka menjadi urutan pihak: Pertama, Kedua, Ketiga, Keempat, dan seterusnya.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="font-mono text-[11.5px] text-primary">
                  {"{{terbilang_pihak(1)}}"} → Pertama
                </p>
                <p className="font-mono text-[11.5px] text-primary">
                  {"{{terbilang_pihak(@number)}}"} → nomor urut di dalam {"{{#each}}"}
                </p>
              </div>
              <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-[11.5px]">
{`{{#each peran.PENERIMA_KUASA as p}}
Pihak {{terbilang_pihak(@number)}}: {{p.nama}}
{{/each}}`}
              </pre>
              <div className="grid grid-cols-2 gap-1.5 text-[11.5px] text-muted-foreground sm:grid-cols-4">
                {[
                  ["1", "Pertama"],
                  ["2", "Kedua"],
                  ["3", "Ketiga"],
                  ["4", "Keempat"],
                  ["10", "Kesepuluh"],
                  ["11", "Kesebelas"],
                  ["20", "Kedua puluh"],
                  ["21", "Kedua puluh satu"],
                ].map(([angka, hasil]) => (
                  <div key={angka} className="rounded-md border bg-card px-2 py-1.5">
                    <span className="font-mono text-foreground">{angka}</span>
                    <span className="mx-1">→</span>
                    {hasil}
                  </div>
                ))}
              </div>
              <p className="text-[11.5px] text-muted-foreground">
                Mendukung puluhan, ratusan, dan ribuan (mis. 100 → Keseratus, 1000 → Keseribu).
                Nilai 0, negatif, desimal, atau bukan angka menghasilkan{" "}
                <code className="font-mono">{'"-"'}</code>.
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14.5px]">Perhitungan — eval()</CardTitle>
              <p className="text-[12px] text-muted-foreground">
                Menghitung ekspresi aritmetika yang memakai variabel template.
                Ekspresi boleh dikutip atau langsung.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-[11.5px]">
{`{{eval('custom.harga_transaksi * 0.05')}}
{{eval(custom.harga_transaksi * 0.05)}}
{{eval('(obyek.luas_tanah * 10000) + custom.biaya')}}
{{eval('@number * 10000')}}
{{eval('round(custom.harga_transaksi / 3, 2)')}}`}
              </pre>
              <div className="grid gap-1.5 text-[11.5px] text-muted-foreground sm:grid-cols-2">
                <p>
                  Operator: <code className="font-mono">+ - * / % **</code> dan tanda kurung.
                </p>
                <p>
                  Fungsi: <code className="font-mono">min</code>,{" "}
                  <code className="font-mono">max</code>,{" "}
                  <code className="font-mono">abs</code>,{" "}
                  <code className="font-mono">round</code>.
                </p>
                <p>
                  Variabel: <code className="font-mono">custom.harga</code>,{" "}
                  <code className="font-mono">obyek.luas_tanah</code>,{" "}
                  <code className="font-mono">@number</code>, dll.
                </p>
                <p>
                  Hasil tidak valid / variabel kosong menghasilkan{" "}
                  <code className="font-mono">{'"-"'}</code>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14.5px]">Pencarian object — find()</CardTitle>
              <p className="text-[12px] text-muted-foreground">
                Mencari satu object di dalam array object.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-[11.5px]">
{`{{find(pihak, peran.PENJUAL).nama}}
{{find(peran.PENJUAL, 'nik', '123').nama}}
{{#if find(pihak, peran.PENJUAL)}}ADA{{else}}TIDAK{{/if}}`}
              </pre>
              <div className="space-y-1.5 text-[11.5px] text-muted-foreground">
                <p>
                  Pencocokan memakai{" "}
                  <code className="font-mono">party_id</code> /{" "}
                  <code className="font-mono">pihak_id</code>,{" "}
                  <code className="font-mono">nik</code>,{" "}
                  <code className="font-mono">ektp_id</code>, lalu{" "}
                  <code className="font-mono">id</code>. Jika tidak ada yang cocok,
                  seluruh field object dibandingkan.
                </p>
                <p>
                  Urutan <code className="font-mono">find(object, array)</code> atau{" "}
                  <code className="font-mono">find(array, object)</code> sama-sama
                  didukung. Bisa juga{" "}
                  <code className="font-mono">find(array, &apos;field&apos;, nilai)</code>.
                </p>
                <p>
                  Jika tidak ditemukan, hasilnya <code className="font-mono">{'"-"'}</code>{" "}
                  saat dicetak.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14.5px]">Penerima PHB — penerima_phb()</CardTitle>
              <p className="text-[12px] text-muted-foreground">
                Menggabungkan logika #each + find + terbilang_pihak menjadi satu teks.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-[11.5px]">
{`{{penerima_phb(peran.PELEPAS, peran.PENERIMA)}}

Hasil:
Pihak Kedua (Budi), Pihak Ketiga (Ani) dan Pihak Kelima (Citra)`}
              </pre>
              <div className="space-y-1.5 text-[11.5px] text-muted-foreground">
                <p>
                  Nomor memakai posisi asli pada array pertama, bukan urutan hasil
                  filter. Jadi pihak yang cocok pada posisi 2, 3, dan 5 tetap menjadi
                  Kedua, Ketiga, dan Kelima.
                </p>
                <p>
                  Argumen ketiga opsional untuk memilih field, mis.{" "}
                  <code className="font-mono">{`penerima_phb(peran.PELEPAS, peran.PENERIMA, 'nik')`}</code>.
                  Default-nya <code className="font-mono">nama</code>.
                </p>
                <p>
                  Jika tidak ada yang cocok, hasilnya <code className="font-mono">{'"-"'}</code>{" "}
                  saat dicetak dan bernilai false di <code className="font-mono">#if</code>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14.5px]">Gelar panjang — gelar_panjang()</CardTitle>
              <p className="text-[12px] text-muted-foreground">
                Mengganti singkatan gelar pada teks dengan kepanjangan dari master
                Gelar.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-[11.5px]">
{`{{gelar_panjang(system.company_name)}}

NAMA NOTARIS, S.H., M.Kn.
→ NAMA NOTARIS, Sarjana Hukum, Magister Kenotariatan`}
              </pre>
              <div className="space-y-1.5 text-[11.5px] text-muted-foreground">
                <p>
                  Data diambil dari menu <b>Data → Gelar</b>. Pencocokan tidak
                  membedakan huruf besar/kecil dan toleran terhadap titik/spasi,
                  mis. <code className="font-mono">S.H.</code>,{" "}
                  <code className="font-mono">SH</code>, atau{" "}
                  <code className="font-mono">S. H.</code>.
                </p>
                <p>
                  Singkatan yang tidak ada di master dibiarkan apa adanya. Teks kosong
                  menghasilkan <code className="font-mono">{'"-"'}</code>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14.5px]">Custom function</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
              <p>
                Tambahkan fungsi sendiri lewat menu{" "}
                <Link className="text-primary underline" href="/function">Function</Link> → tab Custom.
                Implementasi memakai DSL aman dengan argumen <code>$1</code>, <code>$2</code>, dst.
              </p>
              <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-[11.5px]">
{`{{concat($1, ", ", $2)}}`}
              </pre>
              <p>Contoh pemanggilan di template:</p>
              <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-[11.5px]">
{`{{singkat_kota(pihak.wilayah.desa, pihak.wilayah.kecamatan)}}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
