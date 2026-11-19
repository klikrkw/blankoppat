#!/usr/bin/env bash
# Backup project Blanko PPAT + database MySQL.
#
# Pemakaian:
#   bash scripts/backup.sh              # buat backup baru
#   bash scripts/backup.sh --list       # daftar backup yang ada
#   KEEP=20 bash scripts/backup.sh      # simpan 20 backup terakhir (default 10)
#   BACKUP_DIR=/path bash scripts/backup.sh
#
# Hasil: backups/<YYYYmmdd-HHMMSS>/
#   - project.tar.gz   (kode, konfigurasi, storage upload, .git)
#   - database.sql.gz  (mysqldump seluruh database)
#   - MANIFEST.txt     (checksum + ringkasan)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_DIR:-$ROOT/backups}"
KEEP="${KEEP:-10}"
ENV_FILE="$ROOT/backend/.env"

if [[ "${1:-}" == "--list" ]]; then
  echo "Lokasi backup: $BACKUP_ROOT"
  if [[ -d "$BACKUP_ROOT" ]]; then
    du -sh "$BACKUP_ROOT"/*/ 2>/dev/null | sort -k2 || echo "(belum ada backup)"
  else
    echo "(belum ada backup)"
  fi
  exit 0
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE tidak ditemukan" >&2
  exit 1
fi

get_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}

DB_HOST="$(get_env MYSQL_HOST)"; DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="$(get_env MYSQL_PORT)"; DB_PORT="${DB_PORT:-3306}"
DB_NAME="$(get_env MYSQL_DATABASE)"; DB_NAME="${DB_NAME:-blanko_ppat}"
DB_USER="$(get_env MYSQL_USER)"
DB_PASS="$(get_env MYSQL_PASSWORD)"

if [[ -z "$DB_USER" || -z "$DB_NAME" ]]; then
  echo "ERROR: MYSQL_USER / MYSQL_DATABASE tidak terbaca dari $ENV_FILE" >&2
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_ROOT/$TS"
mkdir -p "$DEST"

echo "==> Backup database $DB_NAME"
MYSQL_PWD="$DB_PASS" mysqldump \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  --single-transaction --quick --routines --triggers \
  --default-character-set=utf8mb4 --no-tablespaces \
  "$DB_NAME" | gzip -9 > "$DEST/database.sql.gz"

echo "==> Backup project (tanpa node_modules/.next/.venv)"
tar -czf "$DEST/project.tar.gz" -C "$ROOT" \
  --exclude='./backups' \
  --exclude='./frontend/node_modules' \
  --exclude='./frontend/.next' \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./backend/.venv' \
  --exclude='./.opencode/node_modules' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='*.log' \
  . 2>/dev/null

echo "==> Menulis manifest"
{
  echo "Blanko PPAT backup"
  echo "Dibuat      : $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "Host        : $(hostname)"
  echo "Project     : $ROOT"
  echo "Database    : $DB_NAME@$DB_HOST:$DB_PORT"
  if git -C "$ROOT" rev-parse --short HEAD >/dev/null 2>&1; then
    echo "Git commit  : $(git -C "$ROOT" rev-parse --short HEAD) ($(git -C "$ROOT" rev-parse --abbrev-ref HEAD))"
    echo "Git dirty   : $([[ -n "$(git -C "$ROOT" status --porcelain)" ]] && echo ya || echo tidak)"
  fi
  echo
  echo "== File =="
  ls -lh "$DEST" | sed '1d'
  echo
  echo "== SHA256 =="
  (cd "$DEST" && sha256sum project.tar.gz database.sql.gz)
  echo
  echo "== Isi database =="
  MYSQL_PWD="$DB_PASS" mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
    --batch --skip-column-names -e "
      SELECT CONCAT(table_name, ' = ', table_rows)
      FROM information_schema.tables
      WHERE table_schema='$DB_NAME' ORDER BY table_name;" 2>/dev/null || true
} > "$DEST/MANIFEST.txt"

# checksum archive
(cd "$DEST" && sha256sum project.tar.gz database.sql.gz > SHA256SUMS)

ln -sfn "$DEST" "$BACKUP_ROOT/latest"

# retensi
mapfile -t OLD < <(find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -printf '%f\n' | sort -r | tail -n +"$((KEEP + 1))")
for d in "${OLD[@]:-}"; do
  [[ -z "$d" ]] && continue
  echo "==> Hapus backup lama: $d"
  rm -rf "$BACKUP_ROOT/$d"
done

echo
echo "Selesai: $DEST"
du -sh "$DEST"
echo "Verifikasi cepat:"
gzip -t "$DEST/database.sql.gz" && echo "  database.sql.gz OK"
tar -tzf "$DEST/project.tar.gz" >/dev/null && echo "  project.tar.gz OK"
