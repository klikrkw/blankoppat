# Backup & Restore

Panduan backup project Blanko PPAT dan database MySQL. Backup disimpan di
`backups/<YYYYmmdd-HHMMSS>/` (di-ignore oleh git).

Isi setiap backup:

| File | Isi |
|---|---|
| `project.tar.gz` | Seluruh project: kode, `backend/.env`, `storage/` (template & dokumen), `.git`, konfigurasi nginx/docker |
| `database.sql.gz` | Dump MySQL (`mysqldump --single-transaction --routines --triggers`) |
| `MANIFEST.txt` | Waktu, host, commit git, ukuran file, ringkasan tabel |
| `SHA256SUMS` | Checksum untuk verifikasi sebelum restore |

Yang **tidak** ikut (bisa dibuat ulang): `frontend/node_modules`, `frontend/.next`, `backend/.venv`, `backups/`.

## Membuat backup

```bash
cd /var/www/html/web/blankoppat
bash scripts/backup.sh
```

Default: menyimpan 10 backup terakhir. Ubah dengan `KEEP`:

```bash
KEEP=30 bash scripts/backup.sh
```

Lokasi lain:

```bash
BACKUP_DIR=/mnt/disk-backup/blankoppat bash scripts/backup.sh
```

Lihat daftar backup:

```bash
bash scripts/backup.sh --list
```

Contoh jadwal harian (cron, 02:00):

```cron
0 2 * * * cd /var/www/html/web/blankoppat && KEEP=14 bash scripts/backup.sh >> backups/backup.log 2>&1
```

## Restore

```bash
# lihat dulu
bash scripts/restore.sh --list

# restore semua (database + file project)
bash scripts/restore.sh backups/latest

# hanya database
bash scripts/restore.sh backups/20261120-053252 --db-only

# hanya file project
bash scripts/restore.sh backups/latest --project-only

# tanpa konfirmasi (untuk otomatisasi)
bash scripts/restore.sh backups/latest --yes
```

Perilaku:

1. Checksum `SHA256SUMS` diverifikasi lebih dulu.
2. Restore database otomatis membuat **safety backup** database saat ini ke
   `backups/pre-restore-<timestamp>.sql.gz` (lewati dengan `--no-safety`).
3. Konfirmasi mengetik `RESTORE` (lewati dengan `--yes`).

### Setelah restore

```bash
cd backend
.venv/bin/alembic upgrade head
```

Lalu restart backend (uvicorn/systemd/PM2) dan frontend.

Jika restore ke server baru tanpa database:

```bash
mysql -u root -p -e "CREATE DATABASE blanko_ppat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "GRANT ALL ON blanko_ppat.* TO 'webuser'@'localhost';"
```

Lalu jalankan `bash scripts/restore.sh ...`.

Jika `node_modules` / `.venv` tidak ada (server baru):

```bash
cd frontend && npm install && npm run build
cd ../backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

## Keamanan

- `project.tar.gz` memuat `backend/.env` (kredensial DB, JWT secret, API key).
  Simpan backup di tempat aman, batasi akses (`chmod 600`), dan jangan commit.
- Backup berisi data pribadi (e-KTP). Perlakukan sesuai aturan perlindungan data.
- Uji restore berkala di database salinan sebelum benar-benar dibutuhkan.
