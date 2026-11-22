import type {
  AuditLog,
  BankAccount,
  CustomField,
  CustomFieldGroup,
  CustomFieldOption,
  DocumentItem,
  EktpRecord,
  Invoice,
  JenisHak,
  JenisTransaksi,
  Letak,
  Obyek,
  Payment,
  Pihak,
  SubscriptionPlan,
  Surat,
  SuratCollectionItem,
  SystemSettings,
  Template,
  TemplateCategory,
  TemplateGroup,
  Transaksi,
  User,
  UserSubscription,
} from "./types";

export const users: User[] = [
  {
    id: 1,
    name: "Nur Ahmad Setiawan",
    email: "admin@blankoppat.id",
    username: "admin",
    roles: ["Super Admin"],
    is_active: true,
    created_at: "2026-01-05T08:00:00+07:00",
    last_login: "2026-10-10T07:45:00+07:00",
  },
  {
    id: 2,
    name: "Siti Rahmawati",
    email: "siti@blankoppat.id",
    username: "siti",
    roles: ["Operator"],
    is_active: true,
    created_at: "2026-02-11T09:30:00+07:00",
    last_login: "2026-10-10T08:12:00+07:00",
  },
  {
    id: 3,
    name: "Bambang Prasetyo",
    email: "bambang@blankoppat.id",
    username: "bambang",
    roles: ["Viewer"],
    is_active: true,
    created_at: "2026-03-02T10:00:00+07:00",
    last_login: "2026-10-09T14:20:00+07:00",
  },
  {
    id: 4,
    name: "Dewi Anggraini",
    email: "dewi@blankoppat.id",
    username: "dewi",
    roles: ["Admin"],
    is_active: false,
    created_at: "2026-04-18T08:00:00+07:00",
  },
];

export const ektp: EktpRecord[] = [
  {
    id: 1,
    nik: "3320011001830001",
    nama: "AGUS KUNCORO WARDONO",
    tempat_lahir: "Jepara",
    tanggal_lahir: "1985-01-10",
    jenis_kelamin: "LAKI-LAKI",
    alamat: "Jalan Kartini No. 12",
    rt: "002",
    rw: "005",
    wilayah_id: 1,
    agama: "Islam",
    status_perkawinan: "KAWIN",
    pekerjaan: "Wiraswasta",
    kewarganegaraan: "WNI",
    created_at: "2026-01-10T08:00:00+07:00",
    updated_at: "2026-01-10T08:00:00+07:00",
  },
  {
    id: 2,
    nik: "3320014502880002",
    nama: "SITI NURHALIZA",
    tempat_lahir: "Kudus",
    tanggal_lahir: "1988-02-15",
    jenis_kelamin: "PEREMPUAN",
    alamat: "Jalan Pemuda No. 45",
    rt: "003",
    rw: "001",
    wilayah_id: 1,
    agama: "Islam",
    status_perkawinan: "KAWIN",
    pekerjaan: "Karyawan Swasta",
    kewarganegaraan: "WNI",
    created_at: "2026-01-12T08:00:00+07:00",
    updated_at: "2026-01-12T08:00:00+07:00",
  },
  {
    id: 3,
    nik: "3320011109900003",
    nama: "BUDI SANTOSO",
    tempat_lahir: "Semarang",
    tanggal_lahir: "1990-09-11",
    jenis_kelamin: "LAKI-LAKI",
    alamat: "Jalan A. Yani No. 8",
    rt: "001",
    rw: "003",
    wilayah_id: 1,
    agama: "Kristen",
    status_perkawinan: "BELUM KAWIN",
    pekerjaan: "Pengusaha",
    kewarganegaraan: "WNI",
    created_at: "2026-02-01T08:00:00+07:00",
    updated_at: "2026-02-01T08:00:00+07:00",
  },
  {
    id: 4,
    nik: "3320016007950004",
    nama: "RATNA DEWI PURNAMA",
    tempat_lahir: "Jepara",
    tanggal_lahir: "1995-07-20",
    jenis_kelamin: "PEREMPUAN",
    alamat: "Jalan Cendana No. 3",
    rt: "004",
    rw: "002",
    wilayah_id: 1,
    agama: "Islam",
    status_perkawinan: "BELUM KAWIN",
    pekerjaan: "Pegawai Negeri Sipil",
    kewarganegaraan: "WNI",
    created_at: "2026-02-10T08:00:00+07:00",
    updated_at: "2026-02-10T08:00:00+07:00",
  },
  {
    id: 5,
    nik: "3320012503700005",
    nama: "H. MOHAMMAD SYAFII",
    tempat_lahir: "Demak",
    tanggal_lahir: "1970-03-25",
    jenis_kelamin: "LAKI-LAKI",
    alamat: "Jalan Sultan Trenggono No. 21",
    rt: "005",
    rw: "004",
    wilayah_id: 1,
    agama: "Islam",
    status_perkawinan: "KAWIN",
    pekerjaan: "Petani",
    kewarganegaraan: "WNI",
    created_at: "2026-03-01T08:00:00+07:00",
    updated_at: "2026-03-01T08:00:00+07:00",
  },
  {
    id: 6,
    nik: "3320015708810006",
    nama: "LESTARI WIDYANINGSIH",
    tempat_lahir: "Pati",
    tanggal_lahir: "1981-08-17",
    jenis_kelamin: "PEREMPUAN",
    alamat: "Jalan Diponegoro No. 30",
    rt: "002",
    rw: "001",
    wilayah_id: 1,
    agama: "Islam",
    status_perkawinan: "KAWIN",
    pekerjaan: "Guru",
    kewarganegaraan: "WNI",
    created_at: "2026-03-15T08:00:00+07:00",
    updated_at: "2026-03-15T08:00:00+07:00",
  },
];

export const jenishak: JenisHak[] = [
  { id: 1, nama_jenishak: "Hak Milik", singkatan: "HM" },
  { id: 2, nama_jenishak: "Hak Guna Bangunan", singkatan: "HGB" },
  { id: 3, nama_jenishak: "Hak Pakai", singkatan: "HP" },
  { id: 4, nama_jenishak: "Hak Guna Usaha", singkatan: "HGU" },
];

export const letak: Letak[] = [
  { id: 1, nama_desa: "Ngemplak Kidul", kecamatan: "Jepara" },
  { id: 2, nama_desa: "Bapangan", kecamatan: "Jepara" },
  { id: 3, nama_desa: "Panggang", kecamatan: "Jepara" },
  { id: 4, nama_desa: "Pecangaan Kulon", kecamatan: "Pecangaan" },
  { id: 5, nama_desa: "Ngabul", kecamatan: "Tahunan" },
];

export const obyek: Obyek[] = [
  {
    id: 1,
    jenishak_id: 1,
    jenis_sertipikat: "manual",
    nomor_hak: "1234",
    persil: "56",
    klas: "D.II",
    luas_tanah: 1200,
    luas_bangunan: 180,
    atas_nama: "AGUS KUNCORO WARDONO",
    penggunaan: "non-pertanian",
    no_surat_ukur: "00432/SU/2025",
    tanggal_surat_ukur: "2025-11-02",
    nib: "33200112345678",
    nop: "33.18.100.027.013.0211.0",
    nomor_seri_blanko: "HM-0012345",
    batas_utara: "Tanah milik H. Rasyid",
    batas_timur: "Jalan desa",
    batas_selatan: "Sungai kecil",
    batas_barat: "Tanah milik Budi Santoso",
    wilayah_id: 1,
  },
  {
    id: 2,
    jenishak_id: 1,
    jenis_sertipikat: "elektronik",
    nomor_hak: "2201",
    persil: "112",
    klas: "D.III",
    luas_tanah: 850,
    luas_bangunan: null,
    atas_nama: "H. MOHAMMAD SYAFII",
    penggunaan: "pertanian",
    no_surat_ukur: "00510/SU/2025",
    tanggal_surat_ukur: "2025-12-15",
    nib: "33200187654321",
    nop: "33.18.100.027.013.0212.0",
    nomor_seri_blanko: "HM-0012346",
    batas_utara: "Tanah milik desa",
    batas_timur: "Jalan setapak",
    batas_selatan: "Tanah milik Lestari",
    batas_barat: "Saluran irigasi",
    wilayah_id: 1,
  },
  {
    id: 3,
    jenishak_id: 2,
    jenis_sertipikat: "manual",
    nomor_hak: "0451",
    persil: "77",
    klas: "D.IV",
    luas_tanah: 450,
    luas_bangunan: 120,
    atas_nama: "PT KARYA UTAMA",
    penggunaan: "non-pertanian",
    no_surat_ukur: "00120/SU/2024",
    tanggal_surat_ukur: "2024-06-20",
    nib: "33200111223344",
    nop: "33.18.100.027.013.0213.0",
    nomor_seri_blanko: "HM-0012347",
    batas_utara: "Tanah milik PT Abadi",
    batas_timur: "Jalan raya",
    batas_selatan: "Tanah milik Siti Nurhaliza",
    batas_barat: "Tanah milik Ratna Dewi",
    wilayah_id: 1,
  },
  {
    id: 4,
    jenishak_id: 3,
    jenis_sertipikat: "elektronik",
    nomor_hak: "0912",
    persil: "29",
    klas: "D.V",
    luas_tanah: 300,
    luas_bangunan: null,
    atas_nama: "BUDI SANTOSO",
    penggunaan: "pertanian",
    no_surat_ukur: "00780/SU/2025",
    tanggal_surat_ukur: "2025-08-05",
    nib: "33200155667788",
    nop: "33.18.100.027.013.0214.0",
    nomor_seri_blanko: "HM-0012348",
    batas_utara: "Jalan kabupaten",
    batas_timur: "Tanah milik H. Rasyid",
    batas_selatan: "Tanah milik Agus Kuncoro",
    batas_barat: "Kali kecil",
    wilayah_id: 1,
  },
];

export const templateCategories: TemplateCategory[] = [
  { id: 1, name: "Akta", code: "AKTA", description: "Dokumen akta PPAT", sort_order: 1, is_active: true },
  { id: 2, name: "Surat", code: "SURAT", description: "Surat pendukung", sort_order: 2, is_active: true },
  { id: 3, name: "Pernyataan", code: "PERNY", description: "Surat pernyataan", sort_order: 3, is_active: true },
  { id: 4, name: "Perjanjian", code: "PERJ", description: "Dokumen perjanjian", sort_order: 4, is_active: true },
  { id: 5, name: "Lampiran", code: "LAMP", description: "Dokumen lampiran", sort_order: 5, is_active: true },
];

export const templateGroups: TemplateGroup[] = [
  { id: 1, name: "Jual Beli", code: "JB", description: "Template transaksi jual beli", category_id: 1, sort_order: 1, is_active: true },
  { id: 2, name: "Hibah", code: "HIB", description: "Template transaksi hibah", category_id: 1, sort_order: 2, is_active: true },
  { id: 3, name: "APHT", code: "APHT", description: "Akta Pemberian Hak Tanggungan", category_id: 1, sort_order: 3, is_active: true },
  { id: 4, name: "SKMHT", code: "SKMHT", description: "Surat Kuasa Membebankan Hak Tanggungan", category_id: 4, sort_order: 4, is_active: true },
  { id: 5, name: "Pembagian Hak Bersama", code: "PHB", description: "Pembagian hak bersama", category_id: 1, sort_order: 5, is_active: true },
];

const AJB_CONTENT = `AKTA JUAL BELI
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
Letak             : {{obyek.letak.nama_desa}}, Kecamatan {{obyek.letak.kecamatan}}
NIB               : {{obyek.nib}}

Harga transaksi sebesar:

{{currency(custom.harga_transaksi, "IDR")}}

atau

{{terbilang(custom.harga_transaksi, "rupiah")}}

Demikian akta ini dibuat di hadapan PPAT.
`;

export const templates: Template[] = [
  {
    id: 1,
    name: "Akta Jual Beli",
    code: "AJB",
    description: "Akta Jual Beli tanah standar",
    category_id: 1,
    group_id: 1,
    file_path: "/storage/templates/2026/10/ajb-v3.docx",
    version: 3,
    status: "active",
    created_by: 1,
    created_at: "2026-05-10T08:00:00+07:00",
    updated_at: "2026-09-20T10:00:00+07:00",
  },
  {
    id: 2,
    name: "Akta Hibah",
    code: "AHB",
    description: "Akta hibah tanah",
    category_id: 1,
    group_id: 2,
    file_path: "/storage/templates/2026/10/ahb-v2.docx",
    version: 2,
    status: "active",
    created_by: 1,
    created_at: "2026-06-01T08:00:00+07:00",
    updated_at: "2026-08-15T09:00:00+07:00",
  },
  {
    id: 3,
    name: "Akta Pemberian Hak Tanggungan",
    code: "APHT",
    description: "Akta APHT",
    category_id: 1,
    group_id: 3,
    file_path: "/storage/templates/2026/10/apht-v1.docx",
    version: 1,
    status: "active",
    created_by: 1,
    created_at: "2026-07-05T08:00:00+07:00",
    updated_at: "2026-07-05T08:00:00+07:00",
  },
  {
    id: 4,
    name: "Surat Kuasa Membebankan Hak Tanggungan",
    code: "SKMHT",
    description: "SKMHT",
    category_id: 4,
    group_id: 4,
    file_path: "/storage/templates/2026/10/skmht-v1.docx",
    version: 1,
    status: "active",
    created_by: 1,
    created_at: "2026-07-10T08:00:00+07:00",
    updated_at: "2026-07-10T08:00:00+07:00",
  },
  {
    id: 5,
    name: "Surat Pernyataan",
    code: "SPRN",
    description: "Surat pernyataan para pihak",
    category_id: 3,
    group_id: 1,
    file_path: "/storage/templates/2026/10/sprn-v2.docx",
    version: 2,
    status: "active",
    created_by: 1,
    created_at: "2026-06-15T08:00:00+07:00",
    updated_at: "2026-09-01T08:00:00+07:00",
  },
  {
    id: 6,
    name: "Tanda Terima",
    code: "TTRM",
    description: "Tanda terima pembayaran",
    category_id: 2,
    group_id: 1,
    file_path: "/storage/templates/2026/10/ttrm-v1.docx",
    version: 1,
    status: "draft",
    created_by: 1,
    created_at: "2026-09-25T08:00:00+07:00",
    updated_at: "2026-09-25T08:00:00+07:00",
  },
];

export const templateContents: Record<number, string> = {
  1: AJB_CONTENT,
  2: `AKTA HIBAH
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
`,
  3: `AKTA PEMBERIAN HAK TANGGUNGAN
Nomor: {{custom.nomor_akta}}

{{pembeli[0].nama}} memberikan hak tanggungan atas tanah:

Nomor Hak : {{obyek.nomor_hak}}
Jenis Hak : {{obyek.jenishak.nama_jenishak}}
Letak     : {{obyek.letak.nama_desa}}

Kepada {{penjual[0].nama}} sebesar:

{{currency(custom.harga_transaksi, "IDR")}}
({{terbilang(custom.harga_transaksi, "rupiah")}})
`,
  5: `SURAT PERNYATAAN

Yang bertanda tangan di bawah ini:

Nama  : {{penjual[0].nama}}
NIK   : {{penjual[0].nik}}
Alamat: {{penjual[0].alamat}}

Menyatakan bahwa tanah dengan Nomor Hak {{obyek.nomor_hak}} atas nama {{obyek.atas_nama}} adalah benar miliknya dan tidak dalam sengketa.

Demikian pernyataan ini dibuat dengan sebenar-benarnya.

Jepara, {{tanggal_huruf(today())}}
`,
  6: `TANDA TERIMA

Telah diterima dari {{pembeli[0].nama}} sejumlah:

{{currency(custom.harga_transaksi, "IDR")}}

({{terbilang(custom.harga_transaksi, "rupiah")}})

untuk pembayaran objek tanah Nomor Hak {{obyek.nomor_hak}}.

Jepara, {{tanggal_huruf(today())}}
`,
};

export const customFieldGroups: CustomFieldGroup[] = [
  { id: 1, name: "Data Akta", title: "Data Akta", description: "Field utama akta", sort_order: 1, is_active: true },
  { id: 2, name: "Data Transaksi", title: "Data Transaksi", description: "Field data transaksi", sort_order: 2, is_active: true },
  { id: 3, name: "Data Saksi", title: "Data Saksi", description: "Field data saksi", sort_order: 3, is_active: true },
];

export const customFields: CustomField[] = [
  { id: 1, name: "nomor_akta", field_title: "Nomor Akta", data_type: "text", group_id: 1, source_type: "manual", source_config: null, default_value: null, display: true, required: true, placeholder: "Contoh: 12/2026", description: "Nomor akta", sort_order: 1, is_active: true },
  { id: 2, name: "tanggal_akta", field_title: "Tanggal Akta", data_type: "date", group_id: 1, source_type: "manual", source_config: null, default_value: null, display: true, required: true, placeholder: "Pilih tanggal", description: "Tanggal pembuatan akta", sort_order: 2, is_active: true },
  { id: 3, name: "harga_transaksi", field_title: "Harga Transaksi", data_type: "number", group_id: 2, source_type: "manual", source_config: null, default_value: null, display: true, required: true, placeholder: "Contoh: 500000000", description: "Harga transaksi dalam Rupiah", sort_order: 1, is_active: true },
  { id: 4, name: "uang_muka", field_title: "Uang Muka", data_type: "number", group_id: 2, source_type: "manual", source_config: null, default_value: "0", display: true, required: false, placeholder: "Contoh: 100000000", description: "Uang muka pembayaran", sort_order: 2, is_active: true },
  { id: 5, name: "cara_pembayaran", field_title: "Cara Pembayaran", data_type: "list", group_id: 2, source_type: "manual", source_config: null, default_value: "Tunai", display: true, required: true, placeholder: "Pilih cara pembayaran", description: "Cara pembayaran", sort_order: 3, is_active: true },
  { id: 6, name: "nama_saksi_1", field_title: "Nama Saksi 1", data_type: "text", group_id: 3, source_type: "manual", source_config: null, default_value: null, display: true, required: true, placeholder: "Nama saksi pertama", description: "Saksi pertama", sort_order: 1, is_active: true },
  { id: 7, name: "nama_saksi_2", field_title: "Nama Saksi 2", data_type: "text", group_id: 3, source_type: "manual", source_config: null, default_value: null, display: true, required: false, placeholder: "Nama saksi kedua", description: "Saksi kedua", sort_order: 2, is_active: true },
  { id: 8, name: "jenis_hak_pilihan", field_title: "Jenis Hak (Dari Database)", data_type: "list_from_database", group_id: 1, source_type: "database", source_config: { table: "jenishak", value_column: "id", label_column: "nama_jenishak" }, default_value: null, display: true, required: false, placeholder: "Pilih jenis hak", description: "Pilihan dari tabel jenishak", sort_order: 3, is_active: true },
  { id: 9, name: "keterangan", field_title: "Keterangan", data_type: "textarea", group_id: 2, source_type: "manual", source_config: null, default_value: null, display: true, required: false, placeholder: "Catatan tambahan", description: "Keterangan transaksi", sort_order: 4, is_active: true },
];

export const customFieldOptions: CustomFieldOption[] = [
  { id: 1, custom_field_id: 5, value: "Tunai", label: "Tunai", sort_order: 1, is_active: true },
  { id: 2, custom_field_id: 5, value: "Transfer", label: "Transfer", sort_order: 2, is_active: true },
  { id: 3, custom_field_id: 5, value: "Bertahap", label: "Bertahap", sort_order: 3, is_active: true },
];

export const builtInFunctions = [
  { name: "terbilang", description: "Mengubah angka menjadi terbilang", example: "{{terbilang(custom.harga_transaksi)}}" },
  { name: "terbilang_pihak", description: "Urutan pihak: Pertama, Kedua, Ketiga, Keempat, dst.", example: "{{terbilang_pihak(@number)}}" },
  { name: "eval", description: "Hitung ekspresi aritmetika dengan variabel", example: "{{eval('custom.harga_transaksi * 0.05')}}" },
  { name: "gelar_panjang", description: "Ganti singkatan gelar dengan kepanjangan dari master Gelar", example: "{{gelar_panjang(system.company_name)}}" },
  { name: "terbilang_tanggal", description: "Mengubah tanggal menjadi terbilang", example: "{{terbilang_tanggal(custom.tanggal_akta)}}" },
  { name: "tanggal_huruf", description: "Tanggal format huruf (10 Januari 1985)", example: "{{tanggal_huruf(custom.tanggal_akta)}}" },
  { name: "format_date", description: "Format tanggal Indonesia", example: "{{format_date(pihak.tanggal_lahir, 'DD MMMM YYYY')}}" },
  { name: "find", description: "Cari object di dalam array object", example: "{{find(pihak, peran.PENJUAL).nama}}" },
  { name: "odd", description: "Cek nomor ganjil untuk filter where", example: "{{#each pihak where odd(@number)}}...{{/each}}" },
  { name: "even", description: "Cek nomor genap untuk filter where", example: "{{#each pihak where even(@number)}}...{{/each}}" },
  { name: "penerima_phb", description: "Daftar pihak yang cocok dengan filter, bernomor sesuai posisi aslinya", example: "{{penerima_phb(peran.PELEPAS, peran.PENERIMA)}}" },
  { name: "format_number", description: "Format angka ribuan", example: "{{format_number(obyek.luas_tanah)}}" },
  { name: "currency", description: "Format mata uang", example: "{{currency(custom.harga_transaksi, 'IDR')}}" },
  { name: "upper", description: "Ubah menjadi huruf besar", example: "{{upper(pihak.nama)}}" },
  { name: "lower", description: "Ubah menjadi huruf kecil", example: "{{lower(pihak.nama)}}" },
  { name: "capitalize", description: "Kapitalisasi setiap kata", example: "{{capitalize(pihak.nama)}}" },
  { name: "trim", description: "Hapus spasi berlebih", example: "{{trim(pihak.alamat)}}" },
  { name: "replace", description: "Ganti teks", example: "{{replace(pihak.nama, 'A', 'B')}}" },
  { name: "default", description: "Nilai fallback jika kosong", example: "{{default(custom.keterangan, '-')}}" },
  { name: "sebutan", description: "Tuan/Nona/Nyonya berdasarkan jenis kelamin dan status perkawinan", example: "{{sebutan(pihak.jenis_kelamin, pihak.status_perkawinan)}}" },
  { name: "section", description: "Ambil detail section berdasarkan nama item", example: "{{section('Luas Tanah')}}" },
  { name: "section_contains", description: "Cek apakah ada section dengan nama item", example: "{{#if section_contains('Luas Tanah')}}...{{/if}}" },
  { name: "uraian", description: "Ambil isi master uraian berdasarkan nama", example: "{{uraian('Uraian Jual Beli')}}" },
  { name: "umur", description: "Umur dalam tahun dari tanggal lahir", example: "{{umur(pihak.tanggal_lahir)}}" },
  { name: "today", description: "Tanggal hari ini", example: "{{today()}}" },
];

export const jenistransaksi: JenisTransaksi[] = [
  { id: 1, nama_jenistransaksi: "Jual Beli" },
  { id: 2, nama_jenistransaksi: "Hibah" },
  { id: 3, nama_jenistransaksi: "Pembagian Hak Bersama" },
  { id: 4, nama_jenistransaksi: "APHT" },
  { id: 5, nama_jenistransaksi: "SKMHT" },
];

export const surat: Surat[] = [
  { id: "AJB-001", template_id: 1, jenis_surat: "AKTA", nama_surat: "Akta Jual Beli", keterangan: "Akta utama transaksi jual beli" },
  { id: "SPRN-001", template_id: 5, jenis_surat: "SURAT PERNYATAAN", nama_surat: "Surat Pernyataan", keterangan: "Pernyataan para pihak" },
  { id: "TTRM-001", template_id: 6, jenis_surat: "TANDA TERIMA", nama_surat: "Tanda Terima", keterangan: "Bukti penerimaan pembayaran" },
  { id: "AHB-001", template_id: 2, jenis_surat: "AKTA", nama_surat: "Akta Hibah", keterangan: "Akta utama transaksi hibah" },
  { id: "SPRH-001", template_id: 5, jenis_surat: "SURAT PERNYATAAN", nama_surat: "Surat Pernyataan Hibah", keterangan: "Pernyataan hibah" },
  { id: "APHT-001", template_id: 3, jenis_surat: "AKTA", nama_surat: "Akta Pemberian Hak Tanggungan", keterangan: "Akta APHT" },
  { id: "SKMHT-001", template_id: 4, jenis_surat: "SURAT KUASA", nama_surat: "SKMHT", keterangan: "Surat Kuasa Membebankan Hak Tanggungan" },
];

export const jenistransaksiSurat: SuratCollectionItem[] = [
  { ...surat[0], urutan: 1, wajib: true, default_selected: true, is_active: true },
  { ...surat[1], urutan: 2, wajib: false, default_selected: true, is_active: true },
  { ...surat[2], urutan: 3, wajib: false, default_selected: true, is_active: true },
  { ...surat[3], urutan: 1, wajib: true, default_selected: true, is_active: true },
  { ...surat[4], urutan: 2, wajib: false, default_selected: true, is_active: true },
  { ...surat[5], urutan: 1, wajib: true, default_selected: true, is_active: true },
  { ...surat[6], urutan: 1, wajib: true, default_selected: true, is_active: true },
];

export const suratCollectionMap: Record<number, SuratCollectionItem[]> = {
  1: [jenistransaksiSurat[0], jenistransaksiSurat[1], jenistransaksiSurat[2]],
  2: [jenistransaksiSurat[3], jenistransaksiSurat[4]],
  4: [jenistransaksiSurat[5]],
  5: [jenistransaksiSurat[6]],
};

export const transaksi: Transaksi[] = [
  {
    id: "TRX-2026-0001",
    user_id: 1,
    jenistransaksi_id: 1,
    obyek_id: 1,
    nomor_transaksi: "01/JB/2026",
    tanggal_transaksi: "2026-10-04",
    judul: "Jual Beli Tanah Agus - Budi",
    status: "completed",
    keterangan: "Transaksi selesai",
    created_at: "2026-10-04T09:00:00+07:00",
    updated_at: "2026-10-04T10:30:00+07:00",
  },
  {
    id: "TRX-2026-0002",
    user_id: 1,
    jenistransaksi_id: 1,
    obyek_id: 2,
    nomor_transaksi: "02/JB/2026",
    tanggal_transaksi: "2026-10-08",
    judul: "Jual Beli Tanah Syafii - Ratna",
    status: "active",
    keterangan: "Menunggu generate dokumen",
    created_at: "2026-10-08T08:00:00+07:00",
    updated_at: "2026-10-08T08:00:00+07:00",
  },
  {
    id: "TRX-2026-0003",
    user_id: 2,
    jenistransaksi_id: 2,
    obyek_id: 3,
    nomor_transaksi: "01/HIB/2026",
    tanggal_transaksi: "2026-10-09",
    judul: "Hibah PT Karya Utama - Budi",
    status: "draft",
    keterangan: "",
    created_at: "2026-10-09T13:00:00+07:00",
    updated_at: "2026-10-09T13:00:00+07:00",
  },
];

export const pihakList: Pihak[] = [
  {
    id: "PHK-0001",
    transaksi_id: "TRX-2026-0001",
    nama_pihak: "PENJUAL",
    sebutan_pihak: "PIHAK PERTAMA",
    urutan: 1,
    keterangan: "",
    ektp: [ektp[0]],
  },
  {
    id: "PHK-0002",
    transaksi_id: "TRX-2026-0001",
    nama_pihak: "PEMBELI",
    sebutan_pihak: "PIHAK KEDUA",
    urutan: 2,
    keterangan: "",
    ektp: [ektp[2]],
  },
];

export const documents: DocumentItem[] = [
  {
    id: "mock-doc-0",
    transaction_id: "TRX-2026-0001",
    surat_id: "AJB-001",
    template_id: 1,
    template_version_id: 3,
    document_number: "AJB-000001-2026",
    title: "Akta Jual Beli - Agus Kuncoro Wardono",
    status: "generated",
    generated_file: "/storage/documents/2026/10/AJB-000001-2026.docx",
    created_by: 1,
    created_at: "2026-10-04T10:25:00+07:00",
    snapshot: {},
  },
  {
    id: "mock-doc-0",
    transaction_id: "TRX-2026-0001",
    surat_id: "SPRN-001",
    template_id: 5,
    template_version_id: 2,
    document_number: "SPRN-000002-2026",
    title: "Surat Pernyataan - Jual Beli Agus",
    status: "generated",
    generated_file: "/storage/documents/2026/10/SPRN-000002-2026.docx",
    created_by: 1,
    created_at: "2026-10-04T10:26:00+07:00",
    snapshot: {},
  },
  {
    id: "mock-doc-0",
    transaction_id: "TRX-2026-0002",
    surat_id: "AJB-001",
    template_id: 1,
    template_version_id: 3,
    document_number: "AJB-000003-2026",
    title: "Akta Jual Beli - Syafii (Draft)",
    status: "draft",
    generated_file: "",
    created_by: 1,
    created_at: "2026-10-08T08:15:00+07:00",
    snapshot: {},
  },
];

export const auditLogs: AuditLog[] = [
  { id: 1, user_id: 1, user_name: "Nur Ahmad Setiawan", action: "LOGIN", module: "auth", record_id: "-", detail: "Login berhasil", ip_address: "192.168.1.10", created_at: "2026-10-10T07:45:00+07:00" },
  { id: 2, user_id: 2, user_name: "Siti Rahmawati", action: "LOGIN", module: "auth", record_id: "-", detail: "Login berhasil", ip_address: "192.168.1.12", created_at: "2026-10-10T08:12:00+07:00" },
  { id: 3, user_id: 1, user_name: "Nur Ahmad Setiawan", action: "GENERATE_DOCUMENT", module: "document", record_id: "2", detail: "Generate Surat Pernyataan - Jual Beli Agus", ip_address: "192.168.1.10", created_at: "2026-10-09T15:30:00+07:00" },
  { id: 4, user_id: 1, user_name: "Nur Ahmad Setiawan", action: "UPDATE_TEMPLATE", module: "template", record_id: "1", detail: "Perbarui template Akta Jual Beli ke versi 3", ip_address: "192.168.1.10", created_at: "2026-10-09T14:10:00+07:00" },
  { id: 5, user_id: 2, user_name: "Siti Rahmawati", action: "CREATE_TRANSACTION", module: "transaksi", record_id: "TRX-2026-0003", detail: "Transaksi hibah baru", ip_address: "192.168.1.12", created_at: "2026-10-09T13:00:00+07:00" },
  { id: 6, user_id: 1, user_name: "Nur Ahmad Setiawan", action: "CREATE_CUSTOM_FIELD", module: "custom_field", record_id: "9", detail: "Custom field keterangan dibuat", ip_address: "192.168.1.10", created_at: "2026-10-08T11:00:00+07:00" },
  { id: 7, user_id: 1, user_name: "Nur Ahmad Setiawan", action: "DOWNLOAD_DOCUMENT", module: "document", record_id: "1", detail: "Download AJB-000001-2026.docx", ip_address: "192.168.1.10", created_at: "2026-10-08T10:00:00+07:00" },
];

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 1,
    code: "FREE",
    name: "Free",
    description: "Untuk mencoba aplikasi",
    price: 0,
    billing_period: "monthly",
    document_limit: 5,
    is_free: true,
    is_active: true,
    sort_order: 1,
    features: ["5 dokumen / bulan", "Semua template standar", "Akses data e-KTP", "Dukungan komunitas"],
  },
  {
    id: 2,
    code: "BASIC",
    name: "Basic",
    description: "Untuk PPAT perorangan",
    price: 50000,
    billing_period: "monthly",
    document_limit: 50,
    is_free: false,
    is_active: true,
    sort_order: 2,
    features: ["50 dokumen / bulan", "Semua template standar", "Custom field unlimited", "Prioritas dukungan"],
  },
  {
    id: 3,
    code: "PRO",
    name: "Professional",
    description: "Untuk kantor PPAT aktif",
    price: 150000,
    billing_period: "monthly",
    document_limit: 200,
    is_free: false,
    is_active: true,
    sort_order: 3,
    features: ["200 dokumen / bulan", "Multi user (5 user)", "Custom function", "Audit log lengkap", "Prioritas dukungan"],
  },
  {
    id: 4,
    code: "BUSINESS",
    name: "Business",
    description: "Untuk kantor besar",
    price: 1200000,
    billing_period: "yearly",
    document_limit: 1000,
    is_free: false,
    is_active: true,
    sort_order: 4,
    features: ["1.000 dokumen / tahun", "Multi user (20 user)", "Custom function", "Audit log lengkap", "Dedicated support"],
  },
];

export const userSubscriptions: UserSubscription[] = [
  {
    id: "SUB-2026-001",
    plan_id: 1,
    plan_name: "Free",
    status: "active",
    starts_at: "2026-10-01",
    ends_at: "2026-10-31",
    document_limit: 5,
    document_used: 4,
    auto_renew: true,
  },
  {
    id: "SUB-2026-000",
    plan_id: 1,
    plan_name: "Free",
    status: "expired",
    starts_at: "2026-09-01",
    ends_at: "2026-09-30",
    document_limit: 5,
    document_used: 5,
    auto_renew: true,
  },
];

export const bankAccounts: BankAccount[] = [
  { id: 1, bank_name: "Bank BCA", account_name: "PT BLANKO PPAT INDONESIA", account_number: "1234567890", branch: "Jepara", is_active: true },
  { id: 2, bank_name: "Bank BRI", account_name: "PT BLANKO PPAT INDONESIA", account_number: "0987654321", branch: "Jepara", is_active: true },
];

export const invoices: Invoice[] = [
  {
    id: "INV-001",
    invoice_number: "INV-2026-000123",
    plan_id: 2,
    plan_name: "Basic",
    amount: 50000,
    billing_period: "monthly",
    status: "paid",
    due_at: "2026-10-05",
    paid_at: "2026-10-03T14:00:00+07:00",
    created_at: "2026-10-02T09:00:00+07:00",
  },
  {
    id: "INV-002",
    invoice_number: "INV-2026-000124",
    plan_id: 2,
    plan_name: "Basic",
    amount: 50000,
    billing_period: "monthly",
    status: "pending",
    due_at: "2026-10-12",
    paid_at: null,
    created_at: "2026-10-09T10:00:00+07:00",
  },
];

export const payments: Payment[] = [
  {
    id: "PAY-001",
    invoice_id: "INV-001",
    bank_name: "Bank BCA",
    amount: 50000,
    transfer_date: "2026-10-03",
    sender_name: "Nur Ahmad Setiawan",
    reference_number: "REF-123456",
    proof_file: "bukti-transfer.jpg",
    status: "verified",
  },
];

export const systemSettings: SystemSettings = {
  company_name: "PPAT & Notaris Ahmad Fauzi, S.H., M.Kn.",
  address: "Jl. Kartini No. 25, Panggang, Jepara, Jawa Tengah",
  email: "kantor@ppat-fauzi.id",
  phone: "0291-591234",
  postal_code: "59411",
  permit_number: "SK-05/PPAT/2021",
  permit_date: "2021-04-12",
  daerah_kerja: "Kabupaten Pati",
  wilayah_id: "",
  ektp_id: "",
  default_date_format: "DD MMMM YYYY",
  default_currency: "IDR",
  timezone: "Asia/Jakarta",
  locale: "id-ID",
  subscription_enabled: true,
  free_plan_enabled: true,
  payment_transfer_enabled: true,
  invoice_due_days: 3,
};
