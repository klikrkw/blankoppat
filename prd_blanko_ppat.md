# PRD — Aplikasi Blanko PPAT

**Product Requirements Document**  
**Versi:** 1.0  
**Tanggal:** 4 Oktober 2026  
**Status:** Draft / Ready for Development

---

## 1. Ringkasan Produk

Aplikasi Blanko PPAT adalah aplikasi web untuk membantu pengguna membuat dokumen/blanko PPAT secara otomatis menggunakan template Microsoft Word (`.docx`) yang dapat dibuat dan dikelola sendiri oleh pengguna.

Aplikasi mengambil data dari database MySQL, terutama:

- Data pihak/person dari tabel `ektp`
- Data objek tanah dari tabel `obyek`
- Data letak dari tabel `letak`
- Data jenis hak dari tabel `jenishak`
- Custom field yang dapat dibuat secara dinamis oleh administrator/user berwenang

Pengguna dapat membuat template dokumen Microsoft Word, menentukan kategori dan group template, memasukkan placeholder/field dinamis, kemudian menghasilkan dokumen Word berdasarkan data yang dipilih.

Contoh penggunaan:

1. Memilih data pemohon/pihak dari database e-KTP.
2. Memilih objek tanah.
3. Mengisi custom field tambahan.
4. Memilih template, misalnya Akta Jual Beli.
5. Sistem mengganti placeholder template dengan data database.
6. Sistem menjalankan fungsi seperti terbilang angka, terbilang tanggal, format tanggal, format angka, dan fungsi custom.
7. Sistem menghasilkan file `.docx` yang dapat diunduh, dicetak, atau diedit kembali di Microsoft Word.

---

# 2. Tujuan Produk

## 2.1 Tujuan Utama

Membangun sistem pembuatan blanko/dokumen PPAT yang:

- Mengurangi pekerjaan mengetik data berulang.
- Mengurangi kesalahan input data.
- Menggunakan data terpusat dari database.
- Memungkinkan user membuat dan mengelola template Word sendiri.
- Mendukung placeholder database dan custom field.
- Mendukung fungsi transformasi data.
- Menghasilkan dokumen Microsoft Word secara otomatis.
- Mobile friendly.
- Mendukung mode Light dan Dark.
- Memiliki authentication, role, dan permission.
- Dapat dijalankan menggunakan Docker Compose.
- Terhubung ke MySQL yang berjalan pada Ubuntu Server.

## 2.2 Tujuan Bisnis

- Mempercepat pembuatan dokumen PPAT.
- Meningkatkan konsistensi format dokumen.
- Mengurangi duplikasi data.
- Mempermudah perubahan format blanko.
- Mempermudah pengelolaan berbagai jenis dokumen.
- Menyediakan audit trail terhadap pembuatan dokumen dan perubahan template.

---

# 3. Ruang Lingkup

## 3.1 In Scope

Fitur utama:

1. Authentication.
2. User management.
3. Role management.
4. Permission management.
5. Dashboard.
6. Master kategori template.
7. Master group data.
8. Template Microsoft Word.
9. Template variable/placeholder.
10. Template editor metadata.
11. Data e-KTP.
12. Data objek tanah.
13. Data letak.
14. Data jenis hak.
15. Custom field.
16. Custom field group.
17. Custom field list.
18. Custom field dari database.
19. Function/formatter.
20. Terbilang angka.
21. Terbilang tanggal.
22. Format tanggal.
23. Format angka.
24. Generate DOCX.
25. Preview data sebelum generate.
26. Riwayat dokumen.
27. Download dokumen.
28. Audit log.
29. Light/Dark mode.
30. Responsive/mobile friendly.
31. Docker Compose.
32. MySQL.
33. Python FastAPI backend.
34. Next.js frontend.
35. shadcn/ui.
36. Zod validation.
37. Drizzle ORM pada layer Next.js/BFF/metadata yang membutuhkan runtime TypeScript.
38. Document generation service Python.

## 3.2 Out of Scope Versi 1

Fitur berikut dapat direncanakan untuk versi berikutnya:

- Tanda tangan digital tersertifikasi.
- Integrasi ATR/BPN secara langsung.
- Integrasi Dukcapil secara langsung.
- Pembayaran online.
- E-meterai otomatis.
- Pengiriman dokumen melalui WhatsApp secara native.
- OCR dokumen.
- AI untuk membaca isi akta.
- Multi kantor dengan database terpisah.
- Cloud storage eksternal wajib.

---

# 4. Target User

## 4.1 Administrator

Memiliki akses penuh:

- User.
- Role.
- Permission.
- Template.
- Kategori.
- Group.
- Custom field.
- Function.
- System settings.
- Audit log.

## 4.2 Operator PPAT

Dapat:

- Mencari data e-KTP.
- Memilih objek.
- Mengisi custom field.
- Membuat dokumen.
- Generate dokumen.
- Melihat dokumen yang dibuat.
- Download dokumen.

## 4.3 Viewer

Dapat:

- Melihat data yang diberikan permission.
- Melihat dokumen.
- Tidak dapat mengubah template atau master data.

---

# 5. Arsitektur Teknologi

## 5.1 Frontend

Framework:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query atau equivalent data fetching layer

UI:

- Responsive.
- Mobile friendly.
- Sidebar navigation.
- Header.
- Breadcrumb.
- Data table.
- Dialog.
- Sheet.
- Drawer.
- Command menu.
- Form.
- Tabs.
- Card.
- Toast.
- Dropdown.
- Pagination.

Theme:

- Light mode.
- Dark mode.
- System preference.

## 5.2 Backend

Framework:

- Python
- FastAPI
- Pydantic
- SQLAlchemy atau SQLModel sebagai database access layer Python.
- python-docx untuk manipulasi/generate DOCX.
- Jinja-style/template transformation layer untuk processing variable.
- Babel/locale utility jika diperlukan untuk formatting.
- Custom Indonesian number/date conversion engine.

Backend bertanggung jawab terhadap:

- Business logic.
- Authentication API.
- Authorization.
- Data access.
- Template processing.
- Custom field processing.
- Function engine.
- DOCX generation.
- Audit log.
- Document history.

## 5.3 Drizzle ORM

Karena Drizzle ORM berjalan pada ekosistem TypeScript/Node.js, Drizzle tidak digunakan langsung di Python FastAPI.

Implementasi yang direkomendasikan:

```text
Next.js
   |
   +-- UI
   |
   +-- Server/BFF utilities
          |
          +-- Drizzle ORM
                 |
                 +-- MySQL

Next.js
   |
   +-- REST API Client
          |
          +-- FastAPI
                 |
                 +-- SQLAlchemy/SQLModel
                 |
                 +-- MySQL
                 |
                 +-- DOCX Engine
```

Drizzle digunakan pada layer Next.js yang membutuhkan akses database berbasis TypeScript, terutama metadata aplikasi, migration/schema tooling, atau BFF tertentu.

FastAPI tetap menjadi backend utama dan source of truth untuk business logic.

Akses database yang berpotensi menimbulkan konflik harus diatur melalui ownership tabel dan transaction policy yang jelas.

---

# 6. Infrastruktur

Target deployment:

```text
Ubuntu Server
       |
       +-- Docker Compose
              |
              +-- frontend
              |      Next.js
              |
              +-- backend
              |      FastAPI
              |
              +-- mysql
              |
              +-- redis (optional)
              |
              +-- nginx
              |
              +-- document storage
```

MySQL menggunakan server yang berjalan pada Ubuntu Server dengan host `127.0.0.1`.

Karena aplikasi berjalan di Docker, catatan penting: `127.0.0.1` dari dalam container menunjuk ke container itu sendiri, bukan ke Ubuntu host. Untuk deployment Docker yang menggunakan MySQL di host, konfigurasi jaringan/container harus dibuat agar alamat host dapat dijangkau dari container. Nilai `127.0.0.1` di bawah mengikuti environment yang diminta dan dapat disesuaikan menjadi hostname/gateway Docker jika diperlukan pada deployment aktual.

Contoh:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=blanko_ppat
DB_USERNAME=webuser
DB_PASSWORD=CHANGE_ME

NEXT_PUBLIC_API_URL=http://backend:8000
```

Untuk MySQL host Ubuntu dari container dapat menggunakan:

```env
DB_HOST=host.docker.internal
```

atau konfigurasi host gateway sesuai environment Linux Docker.

---

# 7. Database Existing

## 7.1 Tabel ektp

Struktur:

| Field | Type Konseptual | Keterangan |
|---|---|---|
| id | bigint | Primary key |
| nik | varchar | Nomor Induk Kependudukan |
| nama | varchar | Nama |
| tempat_lahir | varchar | Tempat lahir |
| tanggal_lahir | date | Tanggal lahir |
| jenis_kelamin | varchar | Jenis kelamin |
| alamat | text | Alamat |
| rt | varchar | RT |
| rw | varchar | RW |
| kelurahan | varchar | Kelurahan/desa |
| kecamatan | varchar | Kecamatan |
| agama | varchar | Agama |
| status_perkawinan | varchar | Status perkawinan |
| pekerjaan | varchar | Pekerjaan |
| kewarganegaraan | varchar | Kewarganegaraan |
| created_at | datetime | Waktu dibuat |
| updated_at | datetime | Waktu diubah |

Primary key:

```text
ektp.id
```

**Perubahan struktur RT/RW:**

Field `rt_rw` dihapus. Data RT dan RW disimpan sebagai dua field terpisah:

```text
rt varchar
rw varchar
```

Contoh nilai:

```text
rt = "002"
rw = "005"
```

---

# 8. Tabel Obyek Tanah

Nama tabel:

```text
obyek
```

Field:

| Field | Keterangan |
|---|---|
| id | Primary key |
| jenishak_id | FK ke jenishak.id |
| jenis_sertipikat | manual / elektronik |
| nomor_hak | Nomor hak |
| persil | Nomor persil |
| klas | Klas |
| luas_tanah | Luas tanah |
| luas_bangunan | Luas bangunan |
| atas_nama | Nama pemegang hak |
| penggunaan | pertanian / non-pertanian |
| no_surat_ukur | Nomor surat ukur |
| tanggal_surat_ukur | Tanggal surat ukur |
| nib | NIB |
| batas_utara | Batas utara |
| atas_timur | Batas timur |
| batas_selatan | Batas selatan |
| batas_barat | Batas barat |
| letak_id | FK ke letak.id |

Relasi:

```text
obyek.jenishak_id -> jenishak.id
obyek.letak_id -> letak.id
```

---

# 9. Tabel Letak

Nama tabel:

```text
letak
```

Field:

| Field | Keterangan |
|---|---|
| id | Primary key |
| nama_desa | Nama desa |
| kecamatan_id | ID kecamatan |

Relasi kecamatan dapat diarahkan ke master kecamatan apabila tersedia.

---

# 10. Tabel Jenis Hak

Nama tabel:

```text
jenishak
```

Field:

| Field | Keterangan |
|---|---|
| id | Primary key |
| nama_jenishak | Nama jenis hak |
| singkatan | Singkatan |

Contoh:

```json
{
  "id": 1,
  "nama_jenishak": "Hak Milik",
  "singkatan": "M"
}
```

Contoh hasil pada template:

```text
Hak Milik
```

atau:

```text
M
```

---

# 11. Konsep Data Context

Saat user membuat dokumen, sistem membentuk sebuah context data.

Contoh:

```json
{
  "pihak": {
    "id": 10,
    "nik": "xxxxxxxxxxxxxxxx",
    "nama": "AGUS KUNCORO WARDONO",
    "tempat_lahir": "Jepara",
    "tanggal_lahir": "1985-01-10"
  },
  "obyek": {
    "id": 20,
    "nomor_hak": "1234",
    "luas_tanah": 1200,
    "nib": "..."
  },
  "jenishak": {
    "nama_jenishak": "Hak Milik",
    "singkatan": "M"
  },
  "letak": {
    "nama_desa": "Ngemplak Kidul"
  },
  "custom": {
    "harga_transaksi": 500000000
  }
}
```

Context ini menjadi sumber data untuk template.

---


# 8A. Modul Transaksi, Jenis Transaksi, Surat, dan Pihak

## 8A.1 Konsep

`transaksi` menjadi pusat proses pembuatan dokumen PPAT. Setiap transaksi memiliki satu jenis transaksi, satu objek, dan dapat memiliki banyak pihak.

```text
User
 └── Transaksi
      ├── 1 Jenis Transaksi
      │      └── Banyak Surat
      ├── 1 Objek
      ├── Banyak Pihak
      │      └── Banyak e-KTP
      ├── Custom Field
      └── Dokumen
```

## 8A.2 Tabel jenistransaksi

Nama tabel:

```text
jenistransaksi
```

| Field | Keterangan |
|---|---|
| id | Primary key |
| nama_jenistransaksi | Nama jenis transaksi |

Contoh:

```text
1 | Jual Beli
2 | Hibah
3 | Pembagian Hak Bersama
4 | APHT
5 | SKMHT
```

## 8A.3 Relasi transaksi dengan jenistransaksi

Relasi adalah **one-to-many dari `jenistransaksi` ke `transaksi`**:

```text
jenistransaksi 1 ---- N transaksi
```

Setiap transaksi hanya memiliki satu jenis transaksi melalui:

```text
transaksi.jenistransaksi_id -> jenistransaksi.id
```

Satu jenis transaksi dapat digunakan oleh banyak transaksi.

Contoh:

```text
Jual Beli
 ├── Transaksi AJB-001
 ├── Transaksi AJB-002
 └── Transaksi AJB-003
```

## 8A.4 Tabel transaksi

Nama tabel:

```text
transaksi
```

| Field | Keterangan |
|---|---|
| id | UID/UUID, primary key |
| user_id | FK ke users.id, pemilik transaksi |
| jenistransaksi_id | FK ke jenistransaksi.id |
| obyek_id | FK ke obyek.id |
| nomor_transaksi | Nomor/kode transaksi |
| tanggal_transaksi | Tanggal transaksi |
| judul | Judul transaksi |
| status | draft/active/completed/archived |
| keterangan | Catatan |
| created_at | Waktu dibuat |
| updated_at | Waktu diubah |

Relasi transaksi dengan objek tetap **one-to-one** sesuai kebutuhan sebelumnya.

```text
transaksi 1 ---- 1 obyek
```

Relasi utama transaksi:

```text
jenistransaksi 1 ---- N transaksi 1 ---- 1 obyek
```

`template_id` **tidak lagi disimpan langsung pada tabel `transaksi`**. Surat/template yang dapat digunakan ditentukan melalui relasi `jenistransaksi` dengan `surat`.

## 8A.5 Tabel surat

Nama tabel:

```text
surat
```

| Field | Keterangan |
|---|---|
| id | UID/string, primary key |
| template_id | FK ke templates.id |
| jenis_surat | Jenis surat |
| nama_surat | Nama surat |
| keterangan | Keterangan surat |
| created_at | Waktu dibuat |
| updated_at | Waktu diperbarui |

Contoh:

```text
id: AJB-001
jenis_surat: AKTA
nama_surat: Akta Jual Beli
```

`template_id` menunjuk template Word yang digunakan untuk menghasilkan surat.

## 8A.6 Relasi jenistransaksi dengan surat

Relasi:

```text
jenistransaksi N ---- M surat
```

Karena satu jenis transaksi dapat mempunyai beberapa surat dan satu surat dapat digunakan oleh beberapa jenis transaksi, digunakan tabel pivot:

```text
jenistransaksi_surat
```

Field:

| Field | Keterangan |
|---|---|
| id | UID/UUID |
| jenistransaksi_id | FK ke jenistransaksi.id |
| surat_id | FK ke surat.id |
| urutan | Urutan surat dalam jenis transaksi |
| wajib | Apakah surat wajib |
| created_at | Waktu |
| updated_at | Waktu |

Constraint:

```text
UNIQUE(jenistransaksi_id, surat_id)
```

Contoh:

```text
Jual Beli
 ├── Akta Jual Beli
 ├── Surat Pernyataan
 └── Tanda Terima

Hibah
 ├── Akta Hibah
 └── Surat Pernyataan Hibah
```

Satu surat juga dapat digunakan kembali:

```text
Surat Pernyataan
 ├── Jual Beli
 ├── Hibah
 └── Pembagian Hak Bersama
```

## 8A.7 ERD Jenis Transaksi dan Surat

```text
┌──────────────────────┐
│    jenistransaksi    │
│----------------------│
│ id                   │
│ nama_jenistransaksi  │
└──────────┬───────────┘
           │ 1
           │
           │ N
┌──────────▼───────────┐
│      transaksi       │
│----------------------│
│ id                   │
│ user_id              │
│ jenistransaksi_id    │
│ obyek_id             │
│ nomor_transaksi      │
│ tanggal_transaksi    │
│ status               │
└──────────┬───────────┘
           │
           │ 1
           │
           │ N
┌──────────▼───────────┐
│        pihak         │
└──────────────────────┘

jenistransaksi
      │
      │ N
      ▼
┌──────────────────────┐
│ jenistransaksi_surat │
└──────────┬───────────┘
           │ N
           ▼
┌──────────────────────┐
│        surat         │
│----------------------│
│ id                   │
│ template_id          │
│ jenis_surat          │
│ nama_surat           │
│ keterangan           │
└──────────────────────┘
```

## 8A.8 Relasi Transaksi dengan Pihak

Relasi antara `transaksi` dan `pihak` adalah **one-to-many (1:N)**.

```text
transaksi 1 ---- N pihak
```

Artinya:

- Satu transaksi dapat mempunyai banyak pihak.
- Setiap record `pihak` hanya terkait dengan satu transaksi melalui `pihak.transaksi_id`.
- `transaksi` tidak memiliki `pihak_id`.
- Satu transaksi dapat mempunyai beberapa PENJUAL, PEMBELI, PELEPAS, PENERIMA, dan jenis pihak lain.

## 8A.9 Tabel pihak

Nama tabel:

```text
pihak
```

| Field | Keterangan |
|---|---|
| id | UID/UUID |
| transaksi_id | FK ke transaksi.id |
| nama_pihak | PENJUAL, PEMBELI, PELEPAS, PENERIMA |
| sebutan_pihak | PIHAK PERTAMA, PIHAK KEDUA, PIHAK KETIGA |
| urutan | Urutan pihak dalam dokumen |
| keterangan | Catatan |
| created_at | Waktu dibuat |
| updated_at | Waktu diperbarui |

## 8A.10 Relasi Pihak dengan e-KTP

Relasi:

```text
pihak N:M ektp
```

Tabel pivot:

```text
pihak_ektp
```

| Field | Keterangan |
|---|---|
| id | UID/UUID |
| pihak_id | FK ke pihak.id |
| ektp_id | FK ke ektp.id |
| urutan | Urutan orang |
| keterangan | Catatan |
| created_at | Waktu |
| updated_at | Waktu |

Constraint:

```text
UNIQUE(pihak_id, ektp_id)
```

## 8A.11 ERD Keseluruhan

```text
users
  │
  │ 1:N
  ▼
transaksi ◄──── N:1 ──── jenistransaksi
  │                         │
  │                         │ N:M
  │                         ▼
  │                    jenistransaksi_surat
  │                         │
  │                         ▼
  │                       surat
  │                         │
  │                         │ N:1
  │                         ▼
  │                      templates
  │
  ├──── 1:1 ──── obyek
  │
  └──── 1:N ──── pihak ─── N:M ─── ektp
```

## 8A.12 Ownership

Setiap transaksi wajib memiliki:

```text
transaksi.user_id = current_user.id
```

User normal hanya dapat:

- Melihat transaksi miliknya.
- Membuat transaksi.
- Mengubah transaksi miliknya.
- Menghapus transaksi miliknya sesuai status/permission.
- Mengelola pihak transaksi miliknya.
- Memilih surat yang tersedia untuk jenis transaksi tersebut.
- Mengisi custom field transaksi miliknya.
- Membuat dan mengunduh dokumen transaksi miliknya.

`user_id` tidak boleh diterima dari client saat membuat transaksi normal. Backend mengambilnya dari authenticated user.

Admin dapat mengakses transaksi lintas user hanya jika memiliki:

```text
transaction.view_all
transaction.manage_all
```

## 8A.13 Ownership Dokumen

Dokumen menyimpan:

```text
documents.transaction_id
documents.created_by
```

Akses dokumen mengikuti ownership transaksi.

## 8A.14 Template Context

Template dapat menggunakan:

```text
{{transaksi.nomor_transaksi}}
{{transaksi.tanggal_transaksi}}
{{transaksi.jenistransaksi.nama_jenistransaksi}}
{{pihak.PENJUAL[0].nama}}
{{pihak.PEMBELI[0].nama}}
{{obyek.nomor_hak}}
{{obyek.luas_tanah}}
```

Surat yang tersedia untuk transaksi diperoleh melalui:

```text
transaksi.jenistransaksi
    -> jenistransaksi_surat
    -> surat
    -> template
```

## 8A.15 Workflow Transaksi

```text
Login
  ↓
Transaksi Baru
  ↓
Pilih Jenis Transaksi
  ↓
Pilih Objek
  ↓
Tentukan Pihak
  ↓
Isi Custom Field
  ↓
Pilih Surat
  ↓
Template Surat
  ↓
Preview
  ↓
Generate DOCX
  ↓
Dokumen
```

Saat user memilih jenis transaksi, sistem hanya menampilkan surat yang terkait dengan jenis transaksi tersebut.

## 8A.16 API Jenis Transaksi dan Surat

```text
GET    /api/v1/jenistransaksi
POST   /api/v1/jenistransaksi
GET    /api/v1/jenistransaksi/{id}
PUT    /api/v1/jenistransaksi/{id}
DELETE /api/v1/jenistransaksi/{id}

GET    /api/v1/jenistransaksi/{id}/surat
POST   /api/v1/jenistransaksi/{id}/surat
DELETE /api/v1/jenistransaksi/{id}/surat/{surat_id}

GET    /api/v1/surat
POST   /api/v1/surat
GET    /api/v1/surat/{id}
PUT    /api/v1/surat/{id}
DELETE /api/v1/surat/{id}
```

API transaksi:

```text
GET    /api/v1/transaksi
POST   /api/v1/transaksi
GET    /api/v1/transaksi/{id}
PUT    /api/v1/transaksi/{id}
DELETE /api/v1/transaksi/{id}

GET    /api/v1/transaksi/{id}/surat
POST   /api/v1/transaksi/{id}/documents/preview
POST   /api/v1/transaksi/{id}/documents/generate
```

Semua endpoint transaksi wajib melakukan ownership check.

## 8A.17 Permission

Tambahkan:

```text
transaction.view
transaction.create
transaction.update
transaction.delete
transaction.view_all
transaction.manage_all

jenis_transaksi.view
jenis_transaksi.create
jenis_transaksi.update
jenis_transaksi.delete

surat.view
surat.create
surat.update
surat.delete
surat.manage_relation

party.view
party.create
party.update
party.delete

document.view
document.create
document.download
document.view_all
document.manage_all
```

## 8A.18 Snapshot

Saat dokumen final dibuat, simpan snapshot:

- Data transaksi.
- Jenis transaksi.
- Surat yang dipilih.
- Template dan versi template.
- Data objek.
- Data e-KTP pihak.
- Nama/sebutan pihak.
- Custom field.

Tujuannya agar dokumen lama tetap konsisten walaupun data master, surat, atau template berubah.

## 8A.19 Acceptance Criteria

1. Satu jenis transaksi dapat memiliki banyak transaksi.
2. Setiap transaksi memiliki satu `jenistransaksi_id`.
3. Satu jenis transaksi dapat memiliki banyak surat.
4. Satu surat dapat digunakan pada banyak jenis transaksi.
5. Relasi jenis transaksi dan surat menggunakan tabel pivot.
6. `surat.id` menggunakan UID/string.
7. `surat.template_id` mengarah ke template Word.
8. User hanya dapat mengakses transaksi miliknya kecuali memiliki permission lintas user.
9. Transaksi dapat memiliki banyak pihak.
10. Satu pihak dapat memiliki banyak e-KTP.
11. Template dapat menggunakan data transaksi, jenis transaksi, surat, objek, pihak, dan e-KTP.
12. Saat memilih jenis transaksi, hanya surat yang terkait yang ditampilkan.
13. Snapshot dokumen menyimpan jenis transaksi, surat, template version, dan data transaksi saat generate.



# 8B. Subscription dan Paket Berlangganan

## 8B.1 Tujuan

Aplikasi mendukung sistem subscription agar penggunaan fitur dan jumlah dokumen dapat dibatasi berdasarkan paket yang dimiliki user.

Paket awal:

```text
Free
```

Paket berbayar dapat ditambahkan administrator tanpa perubahan source code.

Periode subscription:

```text
monthly
yearly
```

## 8B.2 Paket Subscription

Tabel:

```text
subscription_plans
```

Field:

| Field | Keterangan |
|---|---|
| id | Primary key |
| code | Kode unik paket |
| name | Nama paket |
| description | Deskripsi |
| price | Harga paket |
| billing_period | monthly/yearly |
| document_limit | Batas dokumen per periode |
| is_free | Paket gratis atau berbayar |
| is_active | Status paket |
| sort_order | Urutan tampilan |
| created_at | Waktu dibuat |
| updated_at | Waktu diubah |

Contoh:

```text
FREE
Harga          : 0
Periode        : monthly
Document Limit : 5
```

Nilai `document_limit` harus configurable sehingga administrator dapat mengubah batas 5 menjadi jumlah lain tanpa perubahan kode.

Nilai khusus dapat digunakan untuk paket unlimited, misalnya:

```text
NULL
```

dengan aturan bahwa `NULL` berarti unlimited apabila diizinkan oleh konfigurasi paket.

## 8B.3 Admin Mengelola Paket

Administrator dapat:

- Membuat paket.
- Mengubah paket.
- Mengaktifkan/nonaktifkan paket.
- Menentukan harga.
- Menentukan periode bulanan/tahunan.
- Menentukan jumlah dokumen.
- Menentukan urutan paket.
- Menentukan apakah paket gratis.
- Melihat jumlah subscriber per paket.

Contoh paket:

```text
Free
5 dokumen/bulan
Rp0

Basic
50 dokumen/bulan
RpXX.XXX

Professional
200 dokumen/bulan
RpXX.XXX

Business
1000 dokumen/tahun
RpX.XXX.XXX
```

## 8B.4 User Subscription

Tabel:

```text
user_subscriptions
```

Field:

| Field | Keterangan |
|---|---|
| id | UID/UUID |
| user_id | FK users.id |
| plan_id | FK subscription_plans.id |
| status | pending/active/expired/cancelled |
| starts_at | Awal periode |
| ends_at | Akhir periode |
| document_limit | Snapshot kuota saat subscription dibuat |
| document_used | Jumlah dokumen terpakai |
| auto_renew | Status perpanjangan otomatis |
| created_at | Waktu |
| updated_at | Waktu |

`document_limit` disimpan sebagai snapshot agar perubahan paket oleh admin tidak mengubah histori subscription yang sedang berjalan secara tidak terkontrol.

Admin dapat menyediakan aturan apakah perubahan limit berlaku langsung atau hanya pada periode berikutnya.

## 8B.5 Subscription Free

Setiap user baru secara otomatis mendapatkan paket:

```text
Free
```

Default:

```text
document_limit = 5
billing_period = monthly
price = 0
```

Batas 5 dokumen dapat diubah oleh admin melalui pengaturan paket.

Contoh:

```text
Free
5 dokumen
01 Oktober - 31 Oktober
```

Setelah periode berakhir, kuota periode berikutnya di-reset sesuai limit paket.

## 8B.6 Penghitungan Dokumen

Sistem harus mendefinisikan dengan jelas apa yang dihitung sebagai dokumen.

Rekomendasi:

> Satu generate dokumen final yang berhasil menghasilkan file DOCX dihitung sebagai satu penggunaan kuota.

Hal berikut tidak mengurangi kuota:

- Membuka halaman.
- Preview HTML.
- Mengedit transaksi.
- Mengedit custom field.
- Test template.
- Generate yang gagal karena error sistem.

Jika user melakukan generate ulang dokumen final, setiap generate ulang dapat dihitung sebagai dokumen baru sesuai konfigurasi billing.

Sistem harus menggunakan transaction/database locking atau mekanisme atomic counter agar dua request generate bersamaan tidak dapat melewati batas kuota.

## 8B.7 Kuota Dokumen

Contoh:

```text
Limit     : 5
Terpakai  : 4
Sisa      : 1
```

Jika:

```text
Terpakai = Limit
```

maka generate berikutnya ditolak:

```text
Kuota dokumen bulan ini telah habis.
Silakan menunggu periode berikutnya atau upgrade subscription.
```

## 8B.8 Dashboard Subscription

User melihat:

```text
Subscription
-------------------------
Paket       : Free
Periode     : Bulanan
Status      : Aktif

Dokumen
████████░░ 4 / 5

Sisa        : 1 dokumen
Berakhir    : 31 Oktober 2026

[Upgrade Paket]
```

Dashboard juga dapat menampilkan:

- Paket aktif.
- Harga.
- Periode.
- Tanggal mulai.
- Tanggal berakhir.
- Dokumen terpakai.
- Sisa kuota.
- Riwayat subscription.
- Riwayat pembayaran.

## 8B.9 Paket Bulanan dan Tahunan

Paket dapat memiliki periode:

```text
monthly
yearly
```

Contoh:

```text
Basic Monthly
Rp50.000 / bulan
50 dokumen

Basic Yearly
Rp500.000 / tahun
600 dokumen
```

Tanggal periode dihitung dari tanggal subscription aktif.

## 8B.10 Upgrade/Downgrade

User dapat memilih paket lain yang tersedia.

Status perubahan:

```text
pending
```

hingga pembayaran terverifikasi.

Untuk downgrade, sistem dapat menerapkan perubahan pada periode berikutnya agar tidak mengganggu subscription aktif.

Aturan upgrade/downgrade harus configurable oleh admin.

# 8C. Pembayaran Subscription melalui Transfer Bank

## 8C.1 Metode Pembayaran

Versi awal menggunakan:

```text
Transfer Bank
```

User memilih paket, sistem membuat invoice pembayaran, kemudian user melakukan transfer ke rekening yang terdaftar pada system settings.

## 8C.2 Bank Account

Tabel:

```text
payment_bank_accounts
```

Field:

| Field | Keterangan |
|---|---|
| id | Primary key |
| bank_name | Nama bank |
| account_name | Nama pemilik rekening |
| account_number | Nomor rekening |
| branch | Cabang, optional |
| is_active | Status |
| sort_order | Urutan |
| created_at | Waktu |
| updated_at | Waktu |

Admin dapat menambahkan beberapa rekening bank.

Contoh:

```text
Bank BCA
No. Rekening : XXXXXXXX
Atas Nama    : PT ABC
```

## 8C.3 Invoice Subscription

Tabel:

```text
subscription_invoices
```

Field:

| Field | Keterangan |
|---|---|
| id | UID/UUID |
| invoice_number | Nomor invoice unik |
| user_id | Pemesan |
| subscription_id | Subscription terkait |
| plan_id | Paket |
| amount | Jumlah pembayaran |
| billing_period | monthly/yearly |
| status | pending/paid/expired/cancelled |
| due_at | Batas pembayaran |
| paid_at | Waktu pembayaran |
| created_at | Waktu |
| updated_at | Waktu |

Contoh:

```text
INV-2026-000123
Basic Monthly
Rp50.000
Status: Menunggu Pembayaran
```

## 8C.4 Payment

Tabel:

```text
subscription_payments
```

Field:

| Field | Keterangan |
|---|---|
| id | UID/UUID |
| invoice_id | FK invoice |
| user_id | FK users |
| bank_account_id | Rekening tujuan |
| amount | Nominal transfer |
| transfer_date | Tanggal transfer |
| sender_name | Nama pengirim |
| reference_number | Referensi transfer |
| proof_file | Bukti transfer |
| status | pending/verified/rejected |
| verified_by | Admin verifier |
| verified_at | Waktu verifikasi |
| rejection_reason | Alasan ditolak |
| created_at | Waktu |
| updated_at | Waktu |

## 8C.5 Upload Bukti Transfer

User dapat mengirim:

- Nama pengirim.
- Tanggal transfer.
- Nominal.
- Rekening tujuan.
- Bukti transfer.

Format bukti transfer yang diperbolehkan:

```text
jpg
jpeg
png
pdf
```

File harus divalidasi ukuran, MIME type, extension, dan disimpan pada storage yang aman.

## 8C.6 Verifikasi Admin

Alur:

```text
User memilih paket
        ↓
Sistem membuat invoice
        ↓
User melihat rekening bank
        ↓
User melakukan transfer
        ↓
User upload bukti transfer
        ↓
Payment = pending
        ↓
Admin memeriksa
        ↓
       ┌───────────────┐
       │               │
    Verified        Rejected
       │               │
       ↓               ↓
Subscription       Minta pembayaran
Active             kembali
```

Jika verified:

```text
payment.status = verified
invoice.status = paid
subscription.status = active
```

## 8C.7 Payment Verification Permission

Tambahkan permission:

```text
subscription.view
subscription.create
subscription.cancel
subscription.view_all
subscription.manage_all

subscription_plan.view
subscription_plan.create
subscription_plan.update
subscription_plan.delete

invoice.view
invoice.view_all
invoice.manage_all

payment.view
payment.view_all
payment.verify
payment.reject

bank_account.view
bank_account.create
bank_account.update
bank_account.delete
```

## 8C.8 Pembayaran Expired

Invoice pending memiliki batas pembayaran.

Jika melewati `due_at`:

```text
invoice.status = expired
```

User harus membuat invoice baru untuk melanjutkan pembelian.

## 8C.9 Idempotency Pembayaran

Sistem harus mencegah pembayaran yang sama mengaktifkan subscription dua kali.

Gunakan:

- Unique invoice.
- Payment status transition.
- Database transaction.
- Idempotency/reference check.

Status pembayaran harus memiliki transition yang terkontrol:

```text
pending -> verified
pending -> rejected
pending -> expired
```

Tidak boleh:

```text
rejected -> verified
```

tanpa proses pembayaran baru.

# 8D. Subscription dan Document Authorization

Sebelum generate dokumen final, backend memeriksa:

```text
1. User authenticated
2. User memiliki akses transaksi
3. Template aktif
4. Subscription aktif
5. Periode subscription masih berlaku
6. document_used < document_limit
```

Flow:

```text
Generate Document
      |
      v
Authentication
      |
      v
Ownership Check
      |
      v
Subscription Check
      |
      v
Quota Check
      |
      v
Generate DOCX
      |
      v
Increment Usage
```

Increment usage dan pembuatan dokumen harus berada dalam transaction yang aman agar kuota tidak dapat dilewati karena concurrent request.

# 8E. Riwayat Subscription

Tabel `user_subscriptions` tidak boleh kehilangan histori ketika user berpindah paket.

Contoh:

```text
User A

Free
01 Jan - 31 Jan
5 dokumen

Basic
01 Feb - 28 Feb
50 dokumen

Professional
01 Mar - 31 Mar
200 dokumen
```

Setiap periode merupakan record subscription tersendiri.

# 8F. Subscription pada User Management

Administrator dapat melihat:

```text
User
Paket
Status
Periode
Limit
Terpakai
Sisa
Pembayaran terakhir
```

Admin dapat:

- Melihat subscription user.
- Mengubah subscription dengan permission khusus.
- Memberikan paket secara manual jika diperlukan.
- Memperpanjang subscription secara manual.
- Mengubah limit subscription sesuai kebijakan.
- Melihat invoice.
- Memverifikasi pembayaran.

Setiap perubahan manual wajib masuk audit log.

# 8G. System Settings Subscription

Tambahkan pengaturan:

```text
subscription_enabled
free_plan_enabled
default_free_plan_id
payment_transfer_enabled
invoice_due_days
document_counting_mode
```

Contoh:

```text
subscription_enabled = true
free_plan_enabled = true
payment_transfer_enabled = true
invoice_due_days = 3
document_counting_mode = successful_generation
```

# 8H. Update Database Tables

Tambahkan tabel:

```text
subscription_plans
user_subscriptions
subscription_invoices
subscription_payments
payment_bank_accounts
```

Struktur application database menjadi:

```text
users
roles
permissions
user_roles
role_permissions

subscription_plans
user_subscriptions
subscription_invoices
subscription_payments
payment_bank_accounts

template_categories
template_groups
templates
template_versions
template_variables

custom_field_groups
custom_fields
custom_field_options
custom_field_values

functions

jenistransaksi
transaksi
pihak
pihak_ektp
surat
jenistransaksi_surat

documents
document_parties
document_objects
document_custom_values
document_snapshots

audit_logs
system_settings
```

# 8I. Acceptance Criteria Subscription

1. User baru otomatis mendapatkan paket Free jika fitur Free aktif.
2. Paket Free secara default memiliki limit 5 dokumen per bulan.
3. Admin dapat mengubah limit paket Free.
4. Admin dapat membuat paket baru.
5. Admin dapat menentukan harga paket.
6. Admin dapat menentukan periode monthly atau yearly.
7. Admin dapat menentukan jumlah dokumen.
8. User dapat melihat paket aktif dan penggunaan kuota.
9. User tidak dapat generate dokumen final jika kuota habis.
10. Preview tidak mengurangi kuota.
11. Generate yang gagal tidak mengurangi kuota.
12. Generate final yang berhasil mengurangi kuota sesuai aturan billing.
13. Kuota di-reset pada periode subscription berikutnya.
14. User dapat memilih paket berbayar.
15. Sistem membuat invoice.
16. User dapat melihat rekening bank tujuan.
17. User dapat upload bukti transfer.
18. Admin dapat memverifikasi pembayaran.
19. Pembayaran verified mengaktifkan subscription sesuai invoice.
20. Pembayaran rejected tidak mengaktifkan subscription.
21. Invoice dapat expired.
22. Sistem mencegah pembayaran yang sama diproses dua kali.
23. User hanya dapat melihat subscription/invoice/payment miliknya.
24. Admin dengan permission yang sesuai dapat melihat seluruh subscription/payment.
25. Semua perubahan subscription dan verifikasi pembayaran dicatat dalam audit log.
26. Tidak ada credential rekening bank yang ditanam hardcoded dalam source code.

# 8J. Roadmap Subscription

## Phase Subscription 1

- Subscription plan.
- Free plan.
- Document quota.
- Monthly/yearly period.
- User subscription dashboard.

## Phase Subscription 2

- Paid plans.
- Bank account management.
- Invoice.
- Transfer payment.
- Upload payment proof.
- Admin verification.

## Phase Subscription 3

- Automated payment gateway.
- Auto renewal.
- Email notification.
- WhatsApp notification.
- Payment reconciliation.
- Promotional code/coupon.

# 12. Sistem Template

## 12.1 Tujuan

User dapat membuat template Microsoft Word sendiri tanpa harus mengubah source code aplikasi.

Format utama:

```text
.docx
```

Template dapat di-upload oleh user.

## 12.2 Metadata Template

Field:

| Field | Keterangan |
|---|---|
| id | Primary key |
| name | Nama template |
| code | Kode unik |
| description | Deskripsi |
| category_id | Kategori |
| group_id | Group |
| file_path | Lokasi file |
| version | Versi |
| status | draft/active/archived |
| created_by | User pembuat |
| created_at | Waktu |
| updated_at | Waktu |

## 12.3 Kategori Template

Contoh:

```text
Akta
Surat
Pernyataan
Perjanjian
Lampiran
Lainnya
```

Kategori dapat dibuat sendiri oleh administrator.

Field:

```text
id
name
code
description
sort_order
is_active
created_at
updated_at
```

## 12.4 Group Template

Group digunakan untuk mengelompokkan template.

Contoh:

```text
Jual Beli
Hibah
APHT
SKMHT
Pembagian Hak Bersama
Roya
Lain-lain
```

Field:

```text
id
name
code
description
category_id
sort_order
is_active
created_at
updated_at
```

---

# 13. Placeholder Template

Sistem menggunakan syntax placeholder yang mudah dipahami.

Format utama:

```text
{{pihak.nama}}
{{pihak.nik}}
{{pihak.tanggal_lahir}}
{{obyek.nomor_hak}}
{{obyek.luas_tanah}}
{{jenishak.nama_jenishak}}
{{letak.nama_desa}}
```

Contoh:

```text
Yang bertanda tangan di bawah ini:

Nama       : {{pihak.nama}}
NIK        : {{pihak.nik}}
Tempat/Tgl : {{pihak.tempat_lahir}}, {{format_date(pihak.tanggal_lahir)}}
Pekerjaan  : {{pihak.pekerjaan}}
Alamat     : {{pihak.alamat}}
```

---

# 14. Nested Data

Template harus mendukung nested object.

Contoh:

```text
{{pihak.nama}}
{{obyek.nomor_hak}}
{{obyek.jenishak.nama_jenishak}}
{{obyek.letak.nama_desa}}
```

Jika relasi tidak tersedia:

```text
{{obyek.jenishak.nama_jenishak}}
```

menghasilkan:

```text
-
```

atau sesuai konfigurasi fallback.

---

# 15. Custom Field

## 15.1 Tujuan

User dapat membuat field tambahan tanpa melakukan perubahan database utama.

Contoh:

```text
harga_transaksi
uang_muka
nomor_akta
tanggal_akta
nama_saksi_1
nama_saksi_2
nomor_sppt
njop
nilai_pbb
```

## 15.2 Struktur Custom Field

Field utama:

| Field | Keterangan |
|---|---|
| id | Primary key |
| name | Nama field |
| field_title | Label field |
| data_type | Tipe data |
| group_id | Group field |
| source_type | manual/database |
| source_config | Konfigurasi sumber |
| default_value | Nilai default |
| display | Apakah ditampilkan |
| required | Wajib/tidak |
| placeholder | Placeholder UI |
| description | Keterangan |
| sort_order | Urutan |
| is_active | Status |
| created_at | Waktu |
| updated_at | Waktu |

## 15.3 Tipe Data

Minimal:

```text
text
number
date
datetime
list
list_from_database
boolean
textarea
```

## 15.4 Nilai Field

Nilai disimpan secara fleksibel.

Contoh:

```json
{
  "harga_transaksi": 500000000,
  "tanggal_akta": "2026-10-04",
  "nama_saksi": "Budi"
}
```

## 15.5 Display

Property:

```text
display
```

digunakan untuk menentukan apakah field muncul pada:

- Form input.
- Preview.
- Variable browser.
- Dokumen.
- Report.

---

# 16. Custom Field Group

Custom field dapat dikelompokkan.

Contoh:

### Data Akta

```text
nomor_akta
tanggal_akta
jenis_akta
```

### Data Transaksi

```text
harga_transaksi
uang_muka
cara_pembayaran
```

### Data Saksi

```text
nama_saksi_1
nama_saksi_2
```

Field:

```text
id
name
title
description
sort_order
is_active
```

---

# 17. List Custom Field

Tipe:

```text
list
```

Contoh:

```text
cara_pembayaran:
- Tunai
- Transfer
- Bertahap
```

Database dapat menyimpan option:

```text
id
custom_field_id
value
label
sort_order
is_active
```

Template mendapatkan:

```text
{{custom.cara_pembayaran}}
```

---

# 18. List From Database

Custom field dapat mengambil option dari tabel database.

Contoh:

```text
nama_field:
jenis_hak

source_table:
jenishak

value_column:
id

label_column:
nama_jenishak
```

Contoh lain:

```text
source_table:
letak

value_column:
id

label_column:
nama_desa
```

Untuk keamanan, query database tidak boleh diberikan sebagai SQL bebas kepada user biasa.

Gunakan konfigurasi terkontrol:

```json
{
  "table": "jenishak",
  "value_column": "id",
  "label_column": "nama_jenishak",
  "where": {
    "is_active": true
  },
  "order_by": "nama_jenishak"
}
```

Administrator dapat menentukan sumber yang diperbolehkan melalui whitelist.

---

# 19. Variable Browser

Aplikasi menyediakan Variable Browser untuk membantu user memasukkan field ke template.

Contoh:

```text
Data Pihak
 ├── NIK
 ├── Nama
 ├── Tempat Lahir
 ├── Tanggal Lahir
 ├── Jenis Kelamin
 └── Alamat

Data Objek
 ├── Nomor Hak
 ├── Persil
 ├── Klas
 ├── Luas Tanah
 ├── Luas Bangunan
 ├── NIB
 └── Surat Ukur

Jenis Hak
 ├── Nama
 └── Singkatan

Letak
 └── Nama Desa

Custom Field
 ├── Harga Transaksi
 ├── Tanggal Akta
 └── ...
```

User dapat:

- Copy variable.
- Insert variable.
- Search variable.
- Melihat tipe data.
- Melihat contoh nilai.

---

# 20. Function Engine

Aplikasi harus menyediakan function engine fleksibel.

Contoh:

```text
{{terbilang(obyek.luas_tanah)}}
{{terbilang(custom.harga_transaksi)}}
{{format_date(pihak.tanggal_lahir)}}
{{format_date(custom.tanggal_akta)}}
{{upper(pihak.nama)}}
{{lower(pihak.nama)}}
{{capitalize(pihak.nama)}}
```

## 20.1 Function Built-in

Minimal:

```text
terbilang
terbilang_tanggal
format_date
format_datetime
format_number
upper
lower
capitalize
trim
replace
default
concat
substring
```

---

# 21. Terbilang Angka

Contoh:

```text
{{terbilang(500000000)}}
```

Hasil:

```text
Lima ratus juta rupiah
```

Konfigurasi dapat mendukung:

```text
{{terbilang(500000000)}}
{{terbilang(500000000, "rupiah")}}
```

Output:

```text
Lima ratus juta rupiah
```

Harus mendukung:

- Angka integer.
- Desimal.
- Nol.
- Angka negatif.
- Rupiah.
- Satuan custom.

---

# 22. Terbilang Tanggal

Contoh:

```text
{{terbilang_tanggal(pihak.tanggal_lahir)}}
```

Output:

```text
sepuluh Januari seribu sembilan ratus delapan puluh lima
```

Format alternatif:

```text
{{tanggal_huruf(pihak.tanggal_lahir)}}
```

Output:

```text
10 Januari 1985
```

---

# 23. Date Formatter

Contoh:

```text
{{format_date(pihak.tanggal_lahir, "DD MMMM YYYY")}}
```

Output:

```text
10 Januari 1985
```

Format harus mendukung locale Indonesia.

Contoh format:

```text
DD-MM-YYYY
DD/MM/YYYY
DD MMMM YYYY
dddd, DD MMMM YYYY
```

---

# 24. Number Formatter

Contoh:

```text
{{format_number(custom.harga_transaksi)}}
```

Input:

```text
500000000
```

Output:

```text
500.000.000
```

Format currency:

```text
{{currency(custom.harga_transaksi, "IDR")}}
```

Output:

```text
Rp500.000.000
```

---

# 25. Flexible Function

Administrator dapat mendefinisikan function tambahan.

Struktur:

```text
id
name
code
description
parameters
implementation
return_type
is_active
created_by
created_at
updated_at
```

Namun eksekusi kode bebas harus dibatasi.

Tidak diperbolehkan menjalankan arbitrary Python/JavaScript langsung dari template tanpa sandbox.

Rekomendasi:

```text
Function DSL
```

atau registry function yang telah disetujui.

Contoh function:

```text
nama_lengkap(nama, gelar_depan, gelar_belakang)
```

Template:

```text
{{nama_lengkap(pihak.nama, custom.gelar_depan, custom.gelar_belakang)}}
```

---

# 26. Conditional Template

Template harus mendukung kondisi.

Contoh:

```text
{{#if obyek.jenis_sertipikat == "elektronik"}}
Sertipikat Elektronik
{{else}}
Sertipikat Manual
{{/if}}
```

Contoh:

```text
{{#if obyek.luas_bangunan}}
Luas Bangunan: {{obyek.luas_bangunan}} m2
{{/if}}
```

---

# 27. Loop / Repeating Data

Untuk kebutuhan beberapa pihak atau beberapa objek, sistem harus mendukung collection.

Contoh:

```text
{{#each pihak}}
Nama: {{nama}}
NIK: {{nik}}
{{/each}}
```

Use case:

- Penjual lebih dari satu.
- Pembeli lebih dari satu.
- Ahli waris.
- Saksi.
- Beberapa objek tanah.

---

# 28. Model Relasi Dokumen

Dokumen dapat memiliki:

```text
Document
 ├── Template
 ├── Pihak
 ├── Objek
 ├── Custom Field Values
 └── Generated File
```

Satu dokumen dapat menggunakan lebih dari satu pihak.

Contoh:

```text
Penjual:
- Agus
- Budi

Pembeli:
- Siti
```

Context dapat menggunakan alias:

```text
{{penjual[0].nama}}
{{penjual[1].nama}}
{{pembeli[0].nama}}
```

---

# 29. Proses Pembuatan Dokumen

## Step 1 — Pilih Template

User memilih:

```text
Kategori
Group
Template
```

## Step 2 — Pilih Pihak

Cari data:

```text
NIK
Nama
```

User memilih data dari `ektp`.

## Step 3 — Pilih Objek

Cari berdasarkan:

```text
Nomor Hak
NIB
Persil
Nama
```

## Step 4 — Isi Custom Field

Form otomatis dibentuk berdasarkan custom field template.

## Step 5 — Preview

Sistem menampilkan:

- Data pihak.
- Data objek.
- Custom field.
- Variable.
- Validasi field wajib.

## Step 6 — Generate

Backend membuat:

```text
.docx
```

## Step 7 — Download

User dapat mengunduh dokumen.

---

# 30. Template Mapping

Template dapat menentukan field yang dibutuhkan.

Contoh:

```text
Template:
Akta Jual Beli

Required:
- pihak.penjual
- pihak.pembeli
- obyek
- custom.harga_transaksi
- custom.tanggal_akta
```

Sistem melakukan validasi sebelum generate.

Jika field belum ada:

```text
Dokumen tidak dapat dibuat.

Field belum diisi:
- Harga Transaksi
- Tanggal Akta
```

---

# 31. DOCX Engine

Python backend menggunakan `python-docx` atau library DOCX yang sesuai.

Engine harus mampu:

- Membuka template `.docx`.
- Mencari placeholder.
- Mengganti text.
- Mempertahankan formatting semaksimal mungkin.
- Mengisi tabel.
- Mengisi paragraph.
- Mengisi header.
- Mengisi footer.
- Mengisi field berulang.
- Memproses conditional.
- Memproses function.
- Menyimpan hasil DOCX.

## Catatan

Placeholder sebaiknya tidak bergantung pada satu run Word saja karena Microsoft Word dapat memecah text placeholder menjadi beberapa run.

Engine harus memiliki mekanisme merge/run normalization untuk mendukung:

```text
{{pihak.nama}}
```

meskipun Word menyimpan placeholder dalam beberapa run.

---

# 32. Alternatif Placeholder

Untuk kompatibilitas Word yang lebih baik, aplikasi dapat mendukung Content Control / Structured Document Tags pada fase lanjutan.

Versi 1 menggunakan:

```text
{{variable}}
```

Versi berikutnya dapat mendukung:

```text
[PPAT_NAMA]
[PIHAK_NAMA]
[OBYEK_NOMOR_HAK]
```

---

# 33. Preview Template

Aplikasi menyediakan preview variable.

Contoh:

```text
Template:
Akta Jual Beli

{{pihak.nama}}
```

Preview:

```text
AGUS KUNCORO WARDONO
```

Preview tidak harus menghasilkan file DOCX final. Preview dapat menggunakan HTML representation untuk pemeriksaan cepat.

---

# 34. Template Versioning

Template harus mendukung versi.

Contoh:

```text
Akta Jual Beli
v1
v2
v3
```

Jika template diubah:

```text
Version 2
```

versi sebelumnya tetap tersedia.

Dokumen lama tetap mengacu ke versi template yang digunakan saat dokumen dibuat.

---

# 35. Document History

Tabel:

```text
documents
```

Field:

```text
id
template_id
template_version
document_number
title
status
generated_file
created_by
created_at
updated_at
```

Status:

```text
draft
generated
archived
```

Riwayat menyimpan:

- Template.
- Versi template.
- User.
- Waktu.
- Data context snapshot.
- File hasil.

Context snapshot penting agar dokumen lama tetap dapat direproduksi meskipun data database berubah.

---

# 36. Audit Log

Semua aktivitas penting dicatat.

Contoh:

```text
LOGIN
LOGOUT
CREATE_TEMPLATE
UPDATE_TEMPLATE
DELETE_TEMPLATE
CREATE_CUSTOM_FIELD
UPDATE_CUSTOM_FIELD
GENERATE_DOCUMENT
DOWNLOAD_DOCUMENT
CREATE_USER
UPDATE_ROLE
```

Field:

```text
id
user_id
action
module
record_id
old_value
new_value
ip_address
user_agent
created_at
```

---

# 37. Authentication

Mendukung:

- Login.
- Logout.
- Password hashing.
- Session/JWT.
- Refresh token.
- Forgot password.
- Change password.
- Account activation/deactivation.

Rekomendasi:

```text
HTTP-only Secure Cookie
```

untuk web authentication.

Password:

```text
Argon2id
```

atau bcrypt.

---

# 38. Role & Permission

## Role

Contoh:

```text
Super Admin
Admin
Operator
Viewer
```

## Permission

Format:

```text
module.action
```

Contoh:

```text
template.view
template.create
template.update
template.delete

custom_field.view
custom_field.create
custom_field.update
custom_field.delete

document.create
document.view
document.download

user.view
user.create
user.update
user.delete
```

Relasi:

```text
users
roles
permissions
user_roles
role_permissions
```

---

# 39. Dashboard

Dashboard menampilkan:

- Jumlah template.
- Template aktif.
- Dokumen dibuat hari ini.
- Dokumen bulan ini.
- User aktif.
- Aktivitas terbaru.
- Template paling sering digunakan.
- Dokumen terakhir dibuat.

---

# 40. Halaman Template

Fitur:

- List template.
- Search.
- Filter kategori.
- Filter group.
- Filter status.
- Upload.
- Download.
- Edit metadata.
- Duplicate.
- Versioning.
- Archive.
- Delete.
- Test template.
- Variable browser.

Contoh UI:

```text
------------------------------------------------
Template PPAT
------------------------------------------------
[Search........] [Kategori] [Group] [+ Template]

| Nama | Kategori | Group | Versi | Status | Aksi |
------------------------------------------------
```

---

# 41. Halaman Custom Field

UI:

```text
Custom Fields

[Search] [Group] [Tipe] [+ Custom Field]

Data Akta
  Nomor Akta      text
  Tanggal Akta    date

Data Transaksi
  Harga           number
  Cara Bayar      list
```

---

# 42. Dynamic Form Builder

Form custom field dibuat otomatis.

Contoh:

```text
Nama Akta
[________________]

Tanggal Akta
[04/10/2026]

Harga Transaksi
[500.000.000]

Cara Pembayaran
[Transfer ▼]
```

Form menggunakan Zod untuk validation schema.

---

# 43. Validation

Zod digunakan di frontend untuk validasi form.

Backend menggunakan Pydantic.

Validasi harus mencakup:

- Required.
- Data type.
- Min/max.
- Regex.
- Date.
- Number.
- Enum/list.
- Dependency validation.

Contoh:

```text
harga_transaksi:
number
required
min: 0
```

---

# 44. Data Search

Data `ektp`:

Search:

```text
nik
nama
alamat
```

Data `obyek`:

Search:

```text
nomor_hak
nib
persil
atas_nama
```

Harus menggunakan pagination.

Contoh:

```text
GET /api/ektp?page=1&page_size=20&search=agus
```

---

# 45. API

Base:

```text
/api/v1
```

## Authentication

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
POST /auth/change-password
```

## Users

```text
GET    /users
POST   /users
GET    /users/{id}
PUT    /users/{id}
DELETE /users/{id}
```

## Roles

```text
GET    /roles
POST   /roles
GET    /roles/{id}
PUT    /roles/{id}
DELETE /roles/{id}
```

## Permissions

```text
GET /permissions
```

## Template

```text
GET    /templates
POST   /templates
GET    /templates/{id}
PUT    /templates/{id}
DELETE /templates/{id}
POST   /templates/{id}/upload
POST   /templates/{id}/duplicate
POST   /templates/{id}/test
GET    /templates/{id}/versions
```

## Category

```text
GET    /template-categories
POST   /template-categories
PUT    /template-categories/{id}
DELETE /template-categories/{id}
```

## Group

```text
GET    /template-groups
POST   /template-groups
PUT    /template-groups/{id}
DELETE /template-groups/{id}
```

## e-KTP

```text
GET /ektp
GET /ektp/{id}
```

## Obyek

```text
GET /obyek
GET /obyek/{id}
```

## Jenis Hak

```text
GET /jenishak
```

## Letak

```text
GET /letak
```

## Custom Fields

```text
GET    /custom-fields
POST   /custom-fields
GET    /custom-fields/{id}
PUT    /custom-fields/{id}
DELETE /custom-fields/{id}
```

## Functions

```text
GET    /functions
POST   /functions
PUT    /functions/{id}
DELETE /functions/{id}
```

## Documents

```text
POST /documents/preview
POST /documents/generate
GET  /documents
GET  /documents/{id}
GET  /documents/{id}/download
```

---

# 46. Generate Document API

Contoh request:

```json
{
  "template_id": 10,
  "parties": {
    "penjual": [1],
    "pembeli": [2]
  },
  "obyek_ids": [100],
  "custom_fields": {
    "harga_transaksi": 500000000,
    "tanggal_akta": "2026-10-04"
  }
}
```

Response:

```json
{
  "success": true,
  "document_id": 123,
  "file_name": "AJB-123-2026.docx",
  "download_url": "/api/v1/documents/123/download"
}
```

---

# 47. Storage

Dokumen hasil disimpan pada storage.

Struktur:

```text
/storage
   /templates
      /2026
   /documents
      /2026
         /10
```

Nama file:

```text
AJB-2026-000123.docx
```

Storage abstraction harus memungkinkan migrasi ke:

- Local filesystem.
- MinIO.
- S3 compatible storage.

---

# 48. Security

## 48.1 Database

- Parameterized query.
- ORM/query builder.
- Tidak mengizinkan SQL bebas dari user.
- Database credentials melalui environment variable.

## 48.2 File Upload

Template `.docx` harus divalidasi:

- Extension.
- MIME type.
- File size.
- Malware scanning jika tersedia.
- Filename sanitization.

## 48.3 Template Security

Template tidak boleh mengeksekusi arbitrary code.

Function engine menggunakan:

```text
Allowlisted functions
```

## 48.4 Authorization

Setiap API harus memeriksa permission.

---

# 49. Mobile Friendly

UI harus responsive:

```text
Desktop
Tablet
Mobile
```

Sidebar pada mobile menjadi drawer.

Data table pada mobile dapat berubah menjadi:

```text
Card list
```

Form menggunakan:

```text
Single column
```

pada layar kecil.

---

# 50. Layout

Struktur:

```text
┌─────────────────────────────────────────────┐
│ Header                                      │
├───────────────┬─────────────────────────────┤
│ Sidebar       │ Content                     │
│               │                             │
│ Dashboard     │ Page Header                │
│ Template      │                             │
│ Dokumen       │ Content                     │
│ Data          │                             │
│ Custom Field  │                             │
│ Settings      │                             │
└───────────────┴─────────────────────────────┘
```

Sidebar:

```text
Dashboard
Dokumen
Template
Data
  - e-KTP
  - Objek
  - Jenis Hak
  - Letak
Custom Field
Function
User Management
Role & Permission
Settings
Audit Log
```

---

# 51. Theme

Menggunakan shadcn/ui.

Mendukung:

```text
Light
Dark
System
```

Primary theme dapat menggunakan warna biru profesional.

Komponen:

- Button.
- Card.
- Table.
- Dialog.
- Sheet.
- Tabs.
- Select.
- Combobox.
- Command.
- Calendar.
- Date Picker.
- Form.
- Dropdown.
- Tooltip.
- Alert.
- Toast.

---

# 52. System Settings

Pengaturan aplikasi:

```text
company_name
address
email
phone
postal_code
map
permit_number
permit_date
logo
```

Tambahan:

```text
default_date_format
default_currency
document_storage
timezone
locale
```

Default:

```text
timezone = Asia/Jakarta
locale = id-ID
currency = IDR
```

Variable:

```text
{{system.company_name}}
{{system.address}}
{{system.email}}
{{system.phone}}
{{system.permit_number}}
```

---

# 53. Template Helper

User dapat menggunakan helper:

```text
{{system.company_name}}
{{today()}}
{{now()}}
{{year()}}
{{month()}}
```

Contoh:

```text
Jepara, {{terbilang_tanggal(today())}}
```

---

# 54. Error Handling

Error harus mudah dipahami user.

Contoh:

```text
Template tidak dapat diproses.

Masalah:
Variable "custom.harga_transaksi" belum memiliki nilai.
```

Untuk developer:

```json
{
  "error": {
    "code": "TEMPLATE_VARIABLE_MISSING",
    "message": "Required variable is missing",
    "field": "custom.harga_transaksi"
  }
}
```

---

# 55. Logging

Backend menggunakan structured logging.

Contoh:

```text
INFO
WARNING
ERROR
```

Log minimal:

- Request ID.
- User ID.
- Endpoint.
- Response time.
- Error.
- Document ID.

Password dan token tidak boleh masuk log.

---

# 56. Testing

## Frontend

- Unit test.
- Component test.
- Form validation test.
- E2E test.

## Backend

- Unit test.
- API test.
- Authentication test.
- Permission test.
- Template engine test.
- Function test.
- DOCX generation test.

## Template Test

Test:

```text
Simple variable
Nested variable
Missing variable
Date
Number
Terbilang
Condition
Loop
Custom field
Database list
```

---

# 57. Acceptance Criteria

## Template

- User dapat upload `.docx`.
- User dapat membuat kategori.
- User dapat membuat group.
- User dapat mengaktifkan/nonaktifkan template.
- Template dapat memiliki version.
- Template dapat menggunakan variable.

## Data

- Sistem dapat mengambil data `ektp`.
- Sistem dapat mengambil data `obyek`.
- Sistem dapat mengambil data `jenishak`.
- Sistem dapat mengambil data `letak`.
- Relasi data dapat digunakan pada template.

## Custom Field

- Admin dapat membuat custom field.
- Field mendukung text.
- Field mendukung number.
- Field mendukung date.
- Field mendukung datetime.
- Field mendukung list.
- Field mendukung list from database.
- Field dapat dikelompokkan.
- Field dapat ditandai required.
- Field dapat disembunyikan dari form/display.

## Function

- Terbilang angka berjalan.
- Terbilang tanggal berjalan.
- Format tanggal berjalan.
- Format angka berjalan.
- Function dapat digunakan dalam placeholder.
- Function tidak dapat menjalankan arbitrary code.

## Document

- User dapat memilih template.
- User dapat memilih pihak.
- User dapat memilih objek.
- User dapat mengisi custom field.
- Sistem memvalidasi data.
- Sistem menghasilkan DOCX.
- Dokumen dapat di-download.
- Riwayat dokumen tersimpan.

## Security

- User wajib login.
- Role dapat dibuat.
- Permission dapat dibuat.
- Endpoint memeriksa permission.
- Password tidak disimpan plaintext.
- File upload divalidasi.

---

# 58. Non Functional Requirements

## Performance

Target:

- API standard < 500 ms untuk query normal.
- Search < 1 detik untuk dataset normal.
- Preview < 3 detik.
- Generate DOCX < 10 detik untuk dokumen normal.

## Availability

Target awal:

```text
99%+
```

## Scalability

Aplikasi harus memungkinkan:

```text
Next.js replicas
FastAPI replicas
Redis queue
Worker DOCX
MinIO/S3
```

---

# 59. Background Job

Untuk dokumen besar, generate DOCX dapat dipindahkan ke worker.

Arsitektur:

```text
Next.js
   |
FastAPI
   |
Redis Queue
   |
Document Worker
   |
DOCX
```

Status:

```text
queued
processing
completed
failed
```

Frontend dapat melakukan polling atau menggunakan WebSocket/SSE.

---

# 60. Recommended Docker Compose

Struktur:

```text
project/
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   └── ...
├── backend/
│   ├── Dockerfile
│   └── ...
├── worker/
│   ├── Dockerfile
│   └── ...
├── nginx/
│   └── nginx.conf
├── storage/
└── .env
```

Service:

```yaml
services:
  frontend:
    build: ./frontend

  backend:
    build: ./backend
    extra_hosts:
      - "host.docker.internal:host-gateway"

  worker:
    build: ./worker
    extra_hosts:
      - "host.docker.internal:host-gateway"

  redis:
    image: redis:alpine

  nginx:
    image: nginx:alpine
```

**Tidak ada service `mysql` pada Docker Compose.**

MySQL sepenuhnya menggunakan MySQL yang sudah berjalan pada Ubuntu Server.

Backend dan worker menggunakan:

```env
MYSQL_HOST=host.docker.internal
MYSQL_PORT=3306
MYSQL_DATABASE=blanko_ppat
MYSQL_USER=webuser
MYSQL_PASSWORD=CHANGE_ME
```

Jika environment server memiliki konfigurasi jaringan Docker yang berbeda, `host.docker.internal` dapat diganti dengan IP host/gateway yang dapat diakses dari container.

---

# 60A. Ketentuan MySQL External Host

Implementasi wajib mengikuti ketentuan berikut:

1. Tidak terdapat service `mysql:` pada `docker-compose.yml`.
2. Tidak terdapat image MySQL dalam Docker Compose.
3. Tidak terdapat volume Docker khusus MySQL.
4. MySQL berjalan sebagai service native pada Ubuntu Server.
5. Database aplikasi menggunakan:

```text
Database : blanko_ppat
User     : webuser
Password : CHANGE_ME
Port     : 3306
```

6. `127.0.0.1` merupakan alamat MySQL dari perspektif Ubuntu host.
7. Container menggunakan alamat host/gateway Docker untuk mencapai MySQL.
8. Backend dan worker harus dapat melakukan koneksi TCP ke port `3306`.
9. Firewall Ubuntu tidak perlu membuka `3306` ke internet; akses cukup dari host/container yang diperlukan.
10. Jika MySQL menggunakan `bind-address=127.0.0.1`, konfigurasi tersebut harus disesuaikan agar container dapat mengakses MySQL. Pilihan konfigurasi harus mengikuti kebijakan keamanan server.
11. User `webuser` harus diberi privilege minimum yang diperlukan pada database `blanko_ppat`.
12. Password `CHANGE_ME` hanya merupakan placeholder PRD dan wajib diganti pada deployment production.

Contoh koneksi:

```text
Docker container
      |
      | host.docker.internal:3306
      v
Ubuntu Server
      |
      | MySQL
      v
blanko_ppat
```

# 61. Environment Variables

Contoh:

```env
APP_NAME=Blanko PPAT
APP_ENV=production
APP_URL=https://blanko.example.com

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=blanko_ppat
MYSQL_USER=webuser
MYSQL_PASSWORD=CHANGE_ME

DATABASE_URL=mysql://webuser:CHANGE_ME@127.0.0.1:3306/blanko_ppat

NEXT_PUBLIC_API_URL=https://blanko.example.com/api

JWT_SECRET=********
STORAGE_PATH=/storage
TIMEZONE=Asia/Jakarta
LOCALE=id-ID
```

Jangan commit `.env` ke Git.

---

# 62. Recommended Database Tables

Selain tabel existing:

```text
users
roles
permissions
user_roles
role_permissions

template_categories
template_groups
templates
template_versions
template_variables

custom_field_groups
custom_fields
custom_field_options
custom_field_values

functions

jenistransaksi
transaksi
surat
jenistransaksi_surat
pihak
pihak_ektp

documents
document_parties
document_objects
document_custom_values
document_snapshots

audit_logs

system_settings
```

---

# 63. Template Variable Registry

Untuk memudahkan pengelolaan variable, gunakan registry.

Contoh:

```text
variable:
pihak.nama

label:
Nama Pihak

type:
text

source:
ektp.nama
```

Contoh:

```text
variable:
obyek.nomor_hak

label:
Nomor Hak

type:
text

source:
obyek.nomor_hak
```

Registry dapat digunakan oleh:

- Variable Browser.
- Validation.
- Template editor.
- Documentation.
- Preview.

---

# 64. Document Context Snapshot

Saat dokumen dibuat, simpan snapshot:

```json
{
  "template_version": 3,
  "generated_at": "2026-10-04T16:00:00+07:00",
  "data": {
    "pihak": {},
    "obyek": {},
    "custom": {}
  }
}
```

Tujuannya:

- Dokumen lama tidak berubah.
- Audit dapat dilakukan.
- Dokumen dapat direproduksi.
- Perubahan database tidak merusak histori.

---

# 65. Template Naming

Template menggunakan:

```text
name
code
version
```

Contoh:

```text
name: Akta Jual Beli
code: AJB
version: 3
```

Generated file:

```text
AJB-000123-2026.docx
```

---

# 66. Data Validation Sebelum Generate

Checklist:

```text
[✓] Template aktif
[✓] Semua pihak tersedia
[✓] Objek tersedia
[✓] Required custom field terisi
[✓] Semua variable tersedia
[✓] Tidak ada error function
[✓] File template valid
```

Jika gagal:

```text
Generate diblokir.
```

---

# 67. Template Test Runner

Administrator dapat melakukan:

```text
Template
→ Test
→ Pilih sample data
→ Preview
→ Generate Test DOCX
```

Ini memungkinkan administrator memastikan template bekerja sebelum digunakan operator.

---

# 68. Data Sample

Sistem dapat menyediakan sample context:

```text
Sample Pihak
Sample Objek
Sample Custom Field
```

Sehingga template dapat diuji tanpa menggunakan data produksi.

---

# 69. Import / Export Template

Template dapat:

- Export.
- Import.
- Duplicate.

Format package dapat berupa:

```text
.zip
```

Isi:

```text
template.docx
metadata.json
variables.json
custom-fields.json
```

Hal ini berguna untuk memindahkan template antar server.

---

# 70. Backup

Backup:

- Database.
- Template.
- Generated document.
- System settings.

Minimal:

```text
Daily database backup
Weekly file backup
```

Retensi dapat dikonfigurasi.

---

# 71. Deployment

Target:

```text
Ubuntu Server
├── MySQL Server (native/system service)
├── Docker Engine
├── Docker Compose
├── Nginx
└── Cloudflare Tunnel atau reverse proxy
```

**MySQL tidak dijalankan menggunakan Docker.**

Contoh:

```text
Internet
   |
Cloudflare
   |
Nginx
   |
Docker Network
   |
   +-- Next.js :3000
   |
   +-- FastAPI :8000
   |
   +-- Worker
   |
   +-- Redis
   |
   |
   +------ TCP 3306 ------> MySQL Ubuntu Host
```

Port MySQL `3306` tidak perlu dibuka ke internet. MySQL cukup menerima koneksi dari Docker network/host sesuai konfigurasi firewall dan `bind-address`.

Untuk keamanan, user database `webuser` sebaiknya diberikan hak hanya pada database:

```text
blanko_ppat
```

dan tidak menggunakan user `root`.

---

# 72. Suggested Project Structure

## Frontend

```text
frontend/
├── app/
├── components/
├── features/
│   ├── auth/
│   ├── templates/
│   ├── documents/
│   ├── custom-fields/
│   ├── users/
│   └── settings/
├── lib/
├── schemas/
├── services/
├── drizzle/
└── types/
```

## Backend

```text
backend/
├── app/
│   ├── main.py
│   ├── api/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── repositories/
│   ├── auth/
│   ├── permissions/
│   ├── template_engine/
│   ├── document_engine/
│   ├── functions/
│   └── utils/
├── tests/
├── requirements.txt
└── Dockerfile
```

---

# 73. Template Engine Architecture

```text
DOCX
 |
Parser
 |
Placeholder Scanner
 |
Variable Resolver
 |
Function Resolver
 |
Condition Processor
 |
Loop Processor
 |
DOCX Renderer
 |
Generated DOCX
```

Resolver:

```text
Variable
   |
   +-- Database
   +-- Custom Field
   +-- System Setting
   +-- Function
```

---

# 74. Function Registry

Contoh registry:

```python
FUNCTIONS = {
    "terbilang": terbilang,
    "terbilang_tanggal": terbilang_tanggal,
    "format_date": format_date,
    "format_number": format_number,
    "upper": str.upper,
    "lower": str.lower,
}
```

Untuk production, registry harus mempunyai metadata:

```text
name
description
parameters
return_type
permission
```

---

# 75. Example Template

Contoh isi Word:

```text
AKTA JUAL BELI

Nomor: {{custom.nomor_akta}}

Pada hari {{format_date(custom.tanggal_akta, "dddd")}},
tanggal {{terbilang_tanggal(custom.tanggal_akta)}},

telah hadir:

Nama              : {{penjual[0].nama}}
NIK               : {{penjual[0].nik}}
Tempat/Tgl Lahir  : {{penjual[0].tempat_lahir}},
                    {{format_date(penjual[0].tanggal_lahir, "DD MMMM YYYY")}}
Pekerjaan         : {{penjual[0].pekerjaan}}
Alamat            : {{penjual[0].alamat}}

Selanjutnya disebut PIHAK PERTAMA.

dan

Nama              : {{pembeli[0].nama}}
NIK               : {{pembeli[0].nik}}

Selanjutnya disebut PIHAK KEDUA.

Objek tanah:

Jenis Hak         : {{obyek.jenishak.nama_jenishak}}
Nomor Hak         : {{obyek.nomor_hak}}
Luas Tanah        : {{format_number(obyek.luas_tanah)}} m²
Letak             : {{obyek.letak.nama_desa}}
NIB               : {{obyek.nib}}

Harga transaksi sebesar:

{{currency(custom.harga_transaksi, "IDR")}}

atau

{{terbilang(custom.harga_transaksi, "rupiah")}}
```

---

# 76. UX Flow

```text
Login
  |
Dashboard
  |
Dokumen Baru
  |
Pilih Template
  |
Pilih Pihak
  |
Pilih Objek
  |
Isi Custom Field
  |
Preview
  |
Validasi
  |
Generate
  |
Download DOCX
```

---

# 77. Menu Application

```text
Dashboard

Dokumen
  ├── Semua Dokumen
  ├── Draft
  └── Dokumen Baru

Template
  ├── Semua Template
  ├── Kategori
  ├── Group
  └── Versi

Data
  ├── e-KTP
  ├── Objek
  ├── Jenis Hak
  └── Letak

Dynamic Field
  ├── Group
  ├── Custom Field
  └── Options

Function
  ├── Built-in
  └── Custom Function

Administration
  ├── Users
  ├── Roles
  ├── Permissions
  └── Audit Log

Settings
  ├── Company
  ├── Document
  └── System
```

---

# 78. Roadmap

## Phase 1 — Foundation

- Docker.
- Next.js.
- FastAPI.
- MySQL connection.
- Authentication.
- User.
- Role.
- Permission.
- Layout.
- Dark/Light theme.

## Phase 2 — Master Data

- e-KTP integration.
- Objek.
- Jenis Hak.
- Letak.
- Search.
- Pagination.

## Phase 3 — Template

- Category.
- Group.
- Upload DOCX.
- Template metadata.
- Version.
- Variable registry.
- Variable Browser.

## Phase 4 — Dynamic Field

- Custom Field.
- Group.
- List.
- Database List.
- Dynamic Form.
- Validation.

## Phase 5 — Document Engine

- Placeholder.
- Nested data.
- Function.
- Terbilang.
- Date formatting.
- Number formatting.
- Conditional.
- Loop.
- DOCX generation.

## Phase 6 — Production

- Document history.
- Audit.
- Background worker.
- Storage.
- Backup.
- Monitoring.
- Security hardening.

---

# 79. MVP Definition

MVP dianggap selesai apabila:

1. User dapat login.
2. Administrator dapat membuat user.
3. Role dan permission berjalan.
4. User dapat melihat data e-KTP.
5. User dapat memilih objek.
6. User dapat membuat kategori template.
7. User dapat membuat group.
8. User dapat upload template Word.
9. User dapat menggunakan placeholder.
10. User dapat membuat custom field.
11. Custom field dapat digunakan di template.
12. Sistem dapat melakukan terbilang angka.
13. Sistem dapat melakukan terbilang tanggal.
14. Sistem dapat format tanggal Indonesia.
15. Sistem dapat generate DOCX.
16. User dapat download DOCX.
17. Dokumen tersimpan dalam histori.
18. Audit log tersedia.
19. UI responsive.
20. Light/Dark mode tersedia.
21. Aplikasi dapat dijalankan dengan Docker Compose.

---

# 80. Definition of Done

Feature dianggap selesai apabila:

- UI selesai.
- API selesai.
- Permission diterapkan.
- Validation diterapkan.
- Unit test tersedia.
- Error handling tersedia.
- Audit log diterapkan jika diperlukan.
- Responsive.
- Light/Dark mode.
- Docker build berhasil.
- Dokumentasi API tersedia.
- Tidak ada credential hardcoded.
- Database migration tersedia.
- Feature berhasil diuji pada environment staging.

---

# 81. Risiko dan Mitigasi

## Risiko 1 — Placeholder Word terpecah

**Masalah:** Word dapat memecah placeholder menjadi beberapa run.

**Mitigasi:** Implementasikan run normalization/placeholder reconstruction.

## Risiko 2 — Arbitrary Code Execution

**Masalah:** Custom function dapat menjadi celah keamanan.

**Mitigasi:** Jangan menjalankan kode bebas. Gunakan allowlist/function DSL/sandbox.

## Risiko 3 — Data Lama Berubah

**Masalah:** Database e-KTP/obyek dapat berubah setelah dokumen dibuat.

**Mitigasi:** Simpan document context snapshot.

## Risiko 4 — Template Rusak

**Masalah:** User upload template invalid.

**Mitigasi:** Validate DOCX dan lakukan test rendering sebelum template diaktifkan.

## Risiko 5 — Dokumen Besar

**Masalah:** Generate DOCX dapat membebani API.

**Mitigasi:** Background worker dengan Redis.

## Risiko 6 — Konflik ORM

**Masalah:** Drizzle dan Python ORM mengakses database yang sama.

**Mitigasi:** Tetapkan ownership tabel/API dan gunakan FastAPI sebagai business source of truth.

---

# 82. Rekomendasi Arsitektur Final

Arsitektur yang direkomendasikan:

```text
                       Internet
                           |
                       Cloudflare
                           |
                         Nginx
                           |
              +------------+-------------+
              |                          |
          Next.js                    FastAPI
       Frontend/BFF                Main Backend
              |                          |
              |                    +-----+------+
              |                    |            |
           Drizzle              MySQL       Redis
              |                    |            |
              +--------------------+         Worker
                                           |
                                      DOCX Engine
                                           |
                                        Storage
```

Tanggung jawab:

### Next.js

- UI.
- Routing.
- SSR.
- Authentication UI.
- Form.
- shadcn/ui.
- Zod.
- BFF utilities.
- Drizzle untuk kebutuhan TypeScript-side database tooling/access yang disepakati.

### FastAPI

- API utama.
- Business logic.
- Authorization enforcement.
- Data access.
- Template engine.
- Function engine.
- DOCX generation.
- Document history.
- Audit.

### MySQL — Ubuntu Server

MySQL merupakan **external host database** dan tidak dijalankan sebagai container Docker.

Database:

```text
blanko_ppat
```

User:

```text
webuser
```

Host pada Ubuntu:

```text
127.0.0.1
```

Port:

```text
3306
```

MySQL menyimpan:

- Existing `ektp`.
- Existing `obyek`.
- Existing `letak`.
- Existing `jenishak`.
- Application tables.

Dari dalam container, koneksi menggunakan hostname/gateway yang mengarah ke Ubuntu host, misalnya:

```text
host.docker.internal:3306
```

Dengan konfigurasi `extra_hosts` Docker:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### Redis

- Queue.
- Cache.
- Background job.

### Worker

- Generate DOCX.
- Process heavy documents.

### Storage

- Template.
- Generated document.
- Backup.

---

# 83. Kesimpulan

Aplikasi Blanko PPAT dirancang sebagai platform document automation yang memisahkan data, template, custom field, dan document engine.

Konsep utamanya adalah:

```text
DATA
  +
TEMPLATE
  +
CUSTOM FIELD
  +
FUNCTION
  =
DOKUMEN PPAT OTOMATIS
```

Dengan pendekatan tersebut, perubahan format dokumen tidak membutuhkan perubahan source code aplikasi. Administrator cukup mengubah atau membuat template Word baru dan menentukan variable yang digunakan.

Arsitektur juga dirancang agar dapat berkembang dari aplikasi internal menjadi platform multi-user dengan role/permission, document history, audit trail, background processing, dan storage yang scalable.

# 84. Koleksi Template Berdasarkan Jenis Transaksi

## 84.1 Tujuan

Saat user membuat transaksi/dokumen baru dan memilih `jenistransaksi`, sistem secara otomatis menampilkan seluruh surat/template yang telah dikaitkan dengan jenis transaksi tersebut. User tidak perlu mencari atau menambahkan template satu per satu secara manual.

Contoh:

- Jenis transaksi **Jual Beli** menampilkan semua surat/template yang dipetakan ke Jual Beli.
- Jenis transaksi **Hibah** menampilkan semua surat/template yang dipetakan ke Hibah.
- Jenis transaksi **Pembagian Hak Bersama** menampilkan semua surat/template yang dipetakan ke jenis tersebut.

Koleksi yang muncul berasal dari relasi many-to-many `jenistransaksi` dan `surat` melalui tabel pivot `jenistransaksi_surat`.

## 84.2 Model Data

### `jenistransaksi`

```text
id
nama_jenistransaksi
created_at
updated_at
```

### `surat`

```text
id                 UID/string, primary key
template_id        FK ke templates.id
jenis_surat
nama_surat
keterangan
created_at
updated_at
```

### `jenistransaksi_surat` (pivot/collection mapping)

```text
id
jenistransaksi_id  FK ke jenistransaksi.id
surat_id           FK ke surat.id
urutan             integer
wajib              boolean
default_selected   boolean
is_active          boolean
created_at
updated_at
```

Constraint yang direkomendasikan:

```text
UNIQUE(jenistransaksi_id, surat_id)
```

`urutan` menentukan urutan tampilan surat. `wajib` menandai surat yang harus disertakan pada proses dokumen. `default_selected` menentukan apakah surat otomatis dicentang saat transaksi baru dibuat. `is_active` memungkinkan admin menonaktifkan pemetaan tanpa menghapus riwayat.

## 84.3 Pengelolaan Koleksi oleh Admin

Admin dengan permission yang sesuai dapat:

- Memilih jenis transaksi.
- Menambahkan satu atau banyak surat/template ke jenis transaksi tersebut.
- Menghapus hubungan surat dari koleksi tanpa menghapus template atau surat master.
- Mengatur urutan tampilan.
- Menandai surat sebagai wajib atau opsional.
- Menentukan apakah surat otomatis dipilih.
- Mengaktifkan/nonaktifkan suatu pemetaan.
- Melihat jumlah surat dalam setiap koleksi.
- Menguji koleksi sebelum diterapkan kepada user.

Template yang belum dipetakan ke jenis transaksi tidak muncul secara default pada alur pembuatan dokumen untuk jenis transaksi tersebut, tetapi tetap tersedia pada halaman administrasi template.

## 84.4 Alur Dokumen Baru

```text
User klik Dokumen/Transaksi Baru
          |
          v
Pilih Jenis Transaksi
          |
          v
Sistem mengambil koleksi surat aktif
          |
          v
Tampilkan seluruh surat/template yang dipetakan
          |
          v
Pilih surat (wajib sudah ditandai)
          |
          v
Isi data transaksi, objek, pihak, dan custom field
          |
          v
Validasi kelengkapan data
          |
          v
Preview dan generate DOCX untuk surat yang dipilih
```

Setelah jenis transaksi dipilih, sistem harus langsung memuat koleksi yang sesuai. Surat yang bertanda `wajib = true` otomatis dipilih dan tidak dapat dilepas oleh user biasa. Surat opsional dapat dipilih atau dilepas sesuai permission dan konfigurasi admin.

## 84.5 Perilaku UI

Pada halaman pembuatan dokumen baru, tampilkan bagian **Koleksi Surat untuk [Nama Jenis Transaksi]** dengan item berupa daftar/card yang memuat:

- Nama surat.
- Jenis surat.
- Deskripsi/keterangan.
- Nama/versi template yang digunakan.
- Status wajib/opsional.
- Checkbox pemilihan untuk surat opsional.
- Indikator template aktif atau tidak tersedia.

Sediakan aksi **Pilih Semua Opsional** dan **Reset ke Pilihan Default**. Surat wajib tetap terpilih. Jika koleksi kosong, tampilkan pesan bahwa admin belum mengonfigurasi koleksi untuk jenis transaksi tersebut dan jangan mengganti koleksi secara diam-diam dengan template jenis lain.

UI harus responsif dan mengikuti tema light/dark serta komponen shadcn/ui.

## 84.6 API

```text
GET    /api/v1/jenistransaksi
GET    /api/v1/jenistransaksi/{id}/surat
POST   /api/v1/jenistransaksi/{id}/surat
PUT    /api/v1/jenistransaksi/{id}/surat/{surat_id}
DELETE /api/v1/jenistransaksi/{id}/surat/{surat_id}
```

Endpoint koleksi untuk user harus hanya mengembalikan surat dengan pemetaan aktif, template aktif, dan akses yang sesuai.

Contoh response:

```json
{
  "jenistransaksi_id": 1,
  "nama_jenistransaksi": "Jual Beli",
  "surat": [
    {
      "id": "surat-uuid-1",
      "nama_surat": "Akta Jual Beli",
      "jenis_surat": "Akta",
      "template_id": 10,
      "urutan": 1,
      "wajib": true,
      "default_selected": true
    },
    {
      "id": "surat-uuid-2",
      "nama_surat": "Surat Pernyataan",
      "jenis_surat": "Surat Pendukung",
      "template_id": 11,
      "urutan": 2,
      "wajib": false,
      "default_selected": true
    }
  ]
}
```

## 84.7 Pembuatan Banyak Dokumen

Satu transaksi dapat menghasilkan beberapa dokumen berdasarkan surat yang dipilih dari koleksi jenis transaksinya. Setiap dokumen hasil harus menyimpan referensi ke transaksi, surat, dan versi template yang digunakan.

Jika satu template gagal diproses, sistem harus menampilkan status kegagalan untuk surat tersebut secara terpisah. Sistem tidak boleh mengklaim semua dokumen berhasil jika hanya sebagian yang selesai.

Disarankan menambahkan/menjamin field berikut pada tabel dokumen:

```text
transaction_id
surat_id
template_id
template_version_id
status
generated_file
created_by
created_at
```

Gunakan constraint/idempotency key yang sesuai agar pengulangan request tidak membuat dokumen duplikat tanpa sengaja.

## 84.8 Keamanan dan Kepemilikan

Koleksi surat adalah konfigurasi bersama yang dikelola oleh admin berwenang. Dokumen hasil tetap dimiliki user yang membuat transaksi.

- User hanya dapat membuat dokumen dari transaksi miliknya.
- User hanya dapat mengakses hasil dokumen yang terkait dengan transaksi miliknya, kecuali memiliki permission lintas-user khusus.
- Endpoint tidak boleh mempercayai `user_id` dari request client.
- Perubahan koleksi oleh admin dicatat dalam audit log.
- Dokumen lama tetap menunjuk pada surat dan versi template yang benar-benar digunakan saat generate, walaupun koleksi berubah setelahnya.

## 84.9 Permission Tambahan

```text
jenistransaksi.view
jenistransaksi.create
jenistransaksi.update
jenistransaksi.delete

jenistransaksi_surat.view
jenistransaksi_surat.manage

surat.view
surat.create
surat.update
surat.delete
```

## 84.10 Acceptance Criteria

1. Admin dapat mengaitkan banyak surat/template ke satu jenis transaksi.
2. Satu surat/template dapat digunakan oleh banyak jenis transaksi.
3. Saat user memilih jenis transaksi untuk dokumen baru, seluruh surat dalam koleksi aktif tampil otomatis.
4. Surat wajib otomatis terpilih dan tidak dapat dilepas oleh user biasa.
5. Surat opsional mengikuti nilai default selection dan dapat dipilih sesuai konfigurasi.
6. Urutan surat mengikuti `urutan` pada pivot.
7. Koleksi kosong ditampilkan sebagai keadaan konfigurasi kosong, bukan mengambil template jenis lain.
8. User dapat menghasilkan beberapa dokumen dalam satu transaksi.
9. Setiap dokumen menyimpan relasi transaksi, surat, dan versi template.
10. Hak akses dokumen tetap mengikuti ownership transaksi.
11. Perubahan koleksi dicatat di audit log.
12. Template yang tidak aktif tidak tersedia untuk generate baru, tetapi histori dokumen lama tetap dapat dilihat sesuai permission.
