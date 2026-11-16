# Deploy Blanko PPAT ke Ubuntu Server

Panduan ini untuk deployment **server baru** dengan:

- Docker Engine + Docker Compose
- MySQL **native** di server (bukan container)
- Cloudflare Tunnel sebagai pintu masuk (tanpa membuka port 80/443)
- Nginx container hanya listen di `127.0.0.1:8091` (`NGINX_PORT` di `.env`)

```text
Internet -> Cloudflare (TLS) -> Cloudflare Tunnel
                                      |
                            127.0.0.1:8091 (Nginx container, NGINX_PORT)
                                      |- /        -> frontend:3002
                                      |- /api     -> backend:8000
                                      `- /storage -> ./backend/storage (read-only)
                                                        |
                                             /app/storage (backend)
                                                        |
                                          host.docker.internal:3306
                                                        |
                                                MySQL native
```

## 1. Persiapan server

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg ufw rsync
```

Install Docker Engine + Compose plugin sesuai dokumentasi resmi Docker, lalu:

```bash
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # logout/login setelah ini
```

Firewall (hanya SSH; Tunnel tidak butuh port masuk):

```bash
sudo ufw allow OpenSSH
sudo ufw enable
```

## 2. MySQL native

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

Buat database dan user aplikasi:

```sql
CREATE DATABASE blanko_ppat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'webuser'@'%' IDENTIFIED BY 'user123#';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON blanko_ppat.* TO 'webuser'@'%';
FLUSH PRIVILEGES;
```

Container menjangkau MySQL lewat gateway Docker (`host.docker.internal`), jadi
MySQL harus listen di interface Docker. Edit `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
bind-address = 0.0.0.0
```

```bash
sudo systemctl restart mysql
```

Izinkan **hanya subnet Docker** mengakses MySQL (sesuai `DOCKER_SUBNET`
di `.env`, default `172.28.0.0/16`):

```bash
sudo ufw allow from 172.28.0.0/16 to any port 3306 proto tcp
sudo ufw reload
```

> Jangan buka port 3306 ke internet. Cukup akses dari host/container.
> Jika `DOCKER_SUBNET` diubah, sesuaikan aturan UFW.

## 3. Pindahkan aplikasi & data dari server lama

Di server lama (lakukan saat aplikasi berhenti / maintenance window):

```bash
# 1) Dump database
#    --no-tablespaces WAJIB untuk user non-admin di MySQL 8.0+.
#    Tanpa itu mysqldump error:
#    "Access denied; you need (at least one of) the PROCESS privilege(s)"
mysqldump --single-transaction --no-tablespaces --routines --triggers \
  -u webuser -p blanko_ppat | gzip > blanko_ppat.sql.gz

# 2) Salin folder storage (template + dokumen)
rsync -a --info=progress2 backend/storage/ \
  user@server-baru:/srv/blankoppat/backend/storage/
```

> **Catatan `--routines --triggers`:** dengan grant minimum di bagian 2, user
> `webuser` tidak punya `TRIGGER`/`SHOW_ROUTINE`, sehingga isi trigger dan
> stored routine **tidak ikut ter-dump** (tanpa pesan error). Aplikasi ini tidak
> memakai trigger/routine, jadi aman. Jika server lama ternyata memilikinya,
> jalankan dump sebagai admin (`sudo mysqldump ...`) atau gunakan user backup
> khusus:
>
> ```sql
> CREATE USER 'backup'@'localhost' IDENTIFIED BY 'PASSWORD_KUAT';
> GRANT SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES, SHOW_ROUTINE,
>       PROCESS, RELOAD, REPLICATION CLIENT
>   ON *.* TO 'backup'@'localhost';
> FLUSH PRIVILEGES;
> ```
>
> Verifikasi hasil dump selalu: `gunzip -t blanko_ppat.sql.gz` dan
> `grep -c "CREATE TABLE" <(gunzip -c blanko_ppat.sql.gz)`.

Di server baru:

```bash
sudo mkdir -p /srv/blankoppat
sudo chown -R $USER:$USER /srv/blankoppat

# Copy source code (git clone atau rsync), lalu:
mysql -u webuser -p blanko_ppat < blanko_ppat.sql.gz
```

> Folder `backend/storage` **wajib** ikut dipindahkan. File DOCX template dan
> dokumen hasil generate disimpan di sana, bukan di database.

## 4. Konfigurasi environment

```bash
cd /srv/blankoppat
cp .env.example .env
nano .env
```

Sesuaikan minimal:

```env
APP_ENV=production
APP_URL=https://ppat.domain-anda.com

MYSQL_HOST=host.docker.internal
MYSQL_DATABASE=blanko_ppat
MYSQL_USER=webuser
MYSQL_PASSWORD=PASSWORD_KUAT

JWT_SECRET=<openssl rand -hex 32>
# WAJIB kosong untuk Docker (same-origin lewat nginx).
# Mengisi "/api" membuat URL ganda /api/api/v1/... -> login gagal (404).
NEXT_PUBLIC_API_URL=
CORS_ORIGINS=https://ppat.domain-anda.com

# Port (opsional, default sudah sesuai)
FRONTEND_PORT=3002   # port http Next.js di dalam container
NGINX_PORT=8091      # port Nginx di 127.0.0.1, target Cloudflare Tunnel
```

> `FRONTEND_PORT`/`NGINX_PORT` dibaca saat `docker compose up -d`
> (tanpa rebuild). Jika `NGINX_PORT` diubah, arahkan juga service
> Cloudflare Tunnel ke port yang sama.

## 5. Build, migrasi, jalankan

```bash
docker compose build

# Jalankan migrasi database (sekali / setiap ada migrasi baru)
docker compose run --rm backend alembic upgrade head

docker compose up -d
docker compose ps
curl http://127.0.0.1:8091/api/v1/health
```

Cek log jika ada masalah:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
```

## 6. Cloudflare Tunnel

1. Buka **Cloudflare Zero Trust → Networks → Tunnels → Create a tunnel**.
2. Pilih **Cloudflared**, beri nama (mis. `blankoppat-prod`).
3. Tambahkan **Public Hostname**:
   - Subdomain/domain: `ppat.domain-anda.com`
   - Service: `http://localhost:8091`
4. Salin token, lalu di server:

```bash
# Install cloudflared (paket .deb resmi Cloudflare), lalu:
sudo cloudflared service install <TOKEN>
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

Tidak perlu membuka port 80/443 di firewall.

## 7. Verifikasi

- [ ] `https://ppat.domain-anda.com` terbuka dan login berhasil
- [ ] Generate dokumen dari wizard dan download DOCX
- [ ] Upload template baru, lalu generate ulang
- [ ] Preview dan hasil DOCX sesuai
- [ ] `http://127.0.0.1:8091/api/v1/health` mengembalikan `{"status":"ok"}`
- [ ] File baru muncul di `backend/storage/documents/...`

## 8. Pasca-deploy (wajib)

- Ganti password `admin` default.
- Pastikan `JWT_SECRET` bukan placeholder.
- Batasi `CORS_ORIGINS` ke domain produksi.
- Hapus user/role demo yang tidak dipakai.
- Aktifkan backup harian.

Contoh backup (`/etc/cron.daily/blankoppat-backup`):

```bash
#!/bin/sh
set -e
STAMP=$(date +%F)
mkdir -p /var/backups/blankoppat
mysqldump --single-transaction --no-tablespaces \
  -u webuser -p"$MYSQL_PASSWORD" blanko_ppat \
  | gzip > /var/backups/blankoppat/db-$STAMP.sql.gz
tar czf /var/backups/blankoppat/storage-$STAMP.tar.gz \
  -C /srv/blankoppat backend/storage
find /var/backups/blankoppat -type f -mtime +14 -delete
```

## 9. Update aplikasi

```bash
cd /srv/blankoppat
# tarik kode terbaru
docker compose build
docker compose run --rm backend alembic upgrade head
docker compose up -d
```

## Catatan penting

- `STORAGE_PATH=storage` bersifat **relatif terhadap `/app`** di container,
  sehingga path lama (`storage/documents/...`) dan path baru tetap sama.
- Jangan mengubah nama folder `backend/storage` tanpa memindahkan datanya.
- Jangan menjalankan `docker compose down -v` di produksi (volume Redis akan
  terhapus; data utama ada di MySQL + folder storage, tetapi tetap berhati-hati).
- Ukuran upload dibatasi 20 MB di `nginx/default.conf.template`
  (`client_max_body_size 20m`).
