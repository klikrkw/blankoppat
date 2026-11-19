# Blanko PPAT — Aplikasi Pembuatan Dokumen PPAT Otomatis

Aplikasi web untuk membuat blanko/dokumen PPAT secara otomatis menggunakan
template Microsoft Word (`.docx`) dengan data terpusat dari database MySQL.

Dibangun berdasarkan PRD `prd_blanko_ppat.md`.

## Arsitektur

```text
Internet
   |
Cloudflare Tunnel (cloudflared di host)
   |
Nginx container (127.0.0.1:8091, atur lewat NGINX_PORT)
   ├── /        → Next.js frontend (port 3002)
   ├── /api     → FastAPI backend (port 8000)
   └── /storage → file dokumen hasil generate

Redis ─ (queue, siap untuk background worker DOCX)

MySQL ── Native service pada Ubuntu Server (127.0.0.1:3306)
          Container menjangkaunya via host.docker.internal
```

**Penting:** MySQL **tidak** dijalankan sebagai container Docker (PRD §60A).
Database `blanko_ppat` diakses dengan user `webuser` dari Ubuntu host.

## Menghubungkan Frontend ke Backend & MySQL

Frontend (Next.js) memanggil FastAPI melalui HTTP; FastAPI mengakses MySQL
(native Ubuntu host).

1. **Siapkan MySQL** — pastikan database `blanko_ppat` + user `webuser`
   sudah ada (lihat bagian Migrasi), lalu jalankan seluruh migrasi:

   ```bash
   cd backend
   alembic upgrade head
   ```

2. **Isi data master** (opsional, tabel existing e-KTP/objek/jenishak/letak):

   ```bash
   mysql -u webuser -p blanko_ppat < migrations/sql/sample_existing_data.sql
   ```

3. **Jalankan backend** (pastikan `backend/.env` menunjuk MySQL yang benar):

   ```bash
   cd backend
   source .venv/bin/activate        # atau gunakan python venv masing-masing
   uvicorn app.main:app --reload    # http://localhost:8000
   ```

   Login API: `admin` / `admin123` (dari seed — ganti password setelah login).

4. **Jalankan frontend** dengan URL API:

   ```bash
   cd frontend
   cp .env.example .env.local       # NEXT_PUBLIC_API_URL=http://localhost:8000
   npm run dev                      # http://localhost:3000
   ```

5. Untuk deployment Docker Compose, **kosongkan** `NEXT_PUBLIC_API_URL`
   (jangan `/api`): frontend memanggil `/api/v1/...` secara same-origin dan
   nginx memproksikan `/api/` ke backend. Mengisi `/api` menghasilkan URL
   ganda `/api/api/v1/...` → 404.

Endpoint utama backend: login (`/api/v1/auth/login`), e-KTP, obyek,
jenishak, letak, template (+konten & preview), custom field, jenis transaksi
& koleksi surat, transaksi (+pihak), generate DOCX, download dokumen,
subscription/invoice/pembayaran (+verifikasi admin), settings, audit log.
Dokumentasi interaktif: http://localhost:8000/docs

## Struktur

```text
frontend/   Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui + Poppins
backend/    FastAPI + SQLAlchemy + python-docx (terbilang, template engine)
nginx/      Reverse proxy
storage/    Template & dokumen hasil generate
```

## Fitur Frontend

- Dashboard (statistik, subscription, aktivitas terbaru)
- Dokumen: list, wizard 7 langkah (jenis transaksi → data → objek →
  pihak → custom field → koleksi surat → preview), detail & download
- Transaksi: jenis transaksi + koleksi surat (wajib/opsional/urutan)
- Template: list, filter, kategori, group, test template, variable browser
- Data: e-KTP, Objek Tanah, Jenis Hak, Letak (search + pagination)
- Dynamic Field: group, custom field (8 tipe data), options
- Function: sandbox terbilang/format + registry built-in
- Administrasi: users, roles, permissions, audit log
- Subscription: paket, kuota dokumen, invoice, transfer bank
- Settings: perusahaan, dokumen, sistem
- Responsive (sidebar → drawer di mobile, tabel → kartu), Light/Dark mode
- Font **Poppins**, tema biru profesional

### Template engine (frontend & backend)

Placeholder `{{variable}}`, nested (`{{obyek.jenishak.nama_jenishak}}`),
function (`{{terbilang(custom.harga_transaksi, 'rupiah')}}`), conditional
(`{{#if}}...{{else}}...{{/if}}`), loop (`{{#each}}`).

## Migrasi Database (Alembic)

Migrasi dikelola dengan Alembic; skema didefinisikan di `backend/app/models.py`.

```bash
cd backend
pip install -r requirements.txt

# Jalankan semua migrasi (membuat tabel + seed data awal)
alembic upgrade head

# Lihat status
alembic current && alembic history

# Rollback
alembic downgrade -1          # satu versi
alembic downgrade base        # kosongkan seluruh skema aplikasi
```

URL database diambil dari `.env` (prioritas: `DATABASE_URL` → `MYSQL_*`
→ fallback SQLite `blanko_ppat_dev.db` untuk development tanpa MySQL).

Isi migrasi:

- `0001_initial` — seluruh tabel aplikasi (users, roles, permissions,
  subscription, template, custom field, transaksi/surat/pihak, dokumen,
  audit, settings) + tabel existing (`ektp`, `obyek`, `letak`, `jenishak`)
  dengan `checkfirst=True` sehingga data lama tidak tersentuh.
- `0002_seed` — seed idempotent: 83 permission, 4 role, admin
  (`admin` / `admin123` — ganti segera), 4 paket subscription, kategori &
  group template, 6 template, jenis transaksi + koleksi surat, custom field
  dan options, serta system settings.

Sample data untuk tabel existing (opsional):

```bash
mysql -u webuser -p blanko_ppat < migrations/sql/sample_existing_data.sql
```

## Menjalankan Lokal (development)

Frontend:

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Akun demo: `admin` / `siti` / `bambang` (password bebas, data mock in-memory).

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. uvicorn app.main:app --reload   # http://localhost:8000/docs
```

Test backend:

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests
```

## Backup & Restore

Panduan lengkap: **[BACKUP.md](BACKUP.md)**.

```bash
# backup project + database
bash scripts/backup.sh

# daftar backup
bash scripts/backup.sh --list

# restore (semua / database saja / file saja)
bash scripts/restore.sh backups/latest
bash scripts/restore.sh backups/latest --db-only
bash scripts/restore.sh backups/latest --project-only
```

Backup disimpan di `backups/<timestamp>/` berisi `project.tar.gz`,
`database.sql.gz`, `MANIFEST.txt`, dan `SHA256SUMS`. Restore membuat safety
backup database saat ini terlebih dahulu.

## Deployment (Docker Compose, Ubuntu Server)

Panduan lengkap: **[DEPLOY.md](DEPLOY.md)**.

Ringkas:

1. MySQL native di server (bukan container), database `blanko_ppat` +
   user `webuser` dengan privilege minimum.
2. Salin `.env.example` → `.env`, isi kredensial dan `JWT_SECRET`.
3. Build, migrasi, jalankan:

```bash
docker compose build
docker compose run --rm backend alembic upgrade head
docker compose up -d
```

Nginx container listen di `127.0.0.1:8091` (ubah lewat `NGINX_PORT` di `.env`)
dan diakses lewat **Cloudflare Tunnel**. Port http frontend di dalam container
diatur `FRONTEND_PORT` (default `3002`). Folder data `backend/storage` di-mount
ke `/app/storage` (template & dokumen) dan `/storage` (read-only untuk Nginx).

## Environment Variables

Lihat `.env.example`. Jangan commit `.env` ke Git.
