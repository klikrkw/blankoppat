#!/usr/bin/env bash
# Restore project dan/atau database Blanko PPAT dari hasil scripts/backup.sh
#
# Pemakaian:
#   bash scripts/restore.sh --list
#   bash scripts/restore.sh backups/20261120-101500
#   bash scripts/restore.sh backups/latest --db-only
#   bash scripts/restore.sh backups/latest --project-only --yes
#
# Opsi:
#   --db-only       hanya database
#   --project-only  hanya file project
#   --yes           tanpa konfirmasi (hati-hati)
#   --no-safety     jangan backup database saat ini sebelum restore
#   --list          tampilkan daftar backup

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_DIR:-$ROOT/backups}"
ENV_FILE="$ROOT/backend/.env"

DO_DB=1
DO_PROJECT=1
ASSUME_YES=0
SAFETY=1
SOURCE=""

for arg in "$@"; do
  case "$arg" in
    --db-only) DO_PROJECT=0 ;;
    --project-only) DO_DB=0 ;;
    --yes|-y) ASSUME_YES=1 ;;
    --no-safety) SAFETY=0 ;;
    --list)
      echo "Lokasi backup: $BACKUP_ROOT"
      [[ -d "$BACKUP_ROOT" ]] && du -sh "$BACKUP_ROOT"/*/ 2>/dev/null | sort -k2 || echo "(belum ada backup)"
      exit 0
      ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      SOURCE="$arg"
      ;;
  esac
done

if [[ -z "$SOURCE" ]]; then
  echo "ERROR: sebutkan folder backup. Contoh: bash scripts/restore.sh backups/latest" >&2
  echo "Gunakan --list untuk melihat daftar backup." >&2
  exit 1
fi

# terima path relatif, absolut, atau nama folder di backups/
if [[ -d "$SOURCE" ]]; then
  SRC="$(cd "$SOURCE" && pwd)"
elif [[ -d "$BACKUP_ROOT/$SOURCE" ]]; then
  SRC="$(cd "$BACKUP_ROOT/$SOURCE" && pwd)"
else
  echo "ERROR: backup tidak ditemukan: $SOURCE" >&2
  exit 1
fi

[[ -f "$SRC/database.sql.gz" ]] || { echo "ERROR: database.sql.gz tidak ada di $SRC" >&2; exit 1; }
[[ -f "$SRC/project.tar.gz" ]]  || { echo "ERROR: project.tar.gz tidak ada di $SRC" >&2; exit 1; }

get_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}

DB_HOST="$(get_env MYSQL_HOST)"; DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="$(get_env MYSQL_PORT)"; DB_PORT="${DB_PORT:-3306}"
DB_NAME="$(get_env MYSQL_DATABASE)"; DB_NAME="${DB_NAME:-blanko_ppat}"
DB_USER="$(get_env MYSQL_USER)"
DB_PASS="$(get_env MYSQL_PASSWORD)"

echo "Sumber backup : $SRC"
[[ -f "$SRC/MANIFEST.txt" ]] && sed -n '1,10p' "$SRC/MANIFEST.txt" | sed 's/^/  /'
echo "Target        : $ROOT"
echo "Database      : $DB_NAME@$DB_HOST:$DB_PORT"
echo "Mode          : $([[ $DO_DB == 1 ]] && echo -n 'database ')$([[ $DO_PROJECT == 1 ]] && echo -n 'project')"
echo

# verifikasi checksum
if [[ -f "$SRC/SHA256SUMS" ]]; then
  echo "==> Verifikasi checksum"
  (cd "$SRC" && sha256sum -c SHA256SUMS)
fi

if [[ $ASSUME_YES -ne 1 ]]; then
  echo
  echo "PERINGATAN: data saat ini akan ditimpa."
  read -r -p "Ketik RESTORE untuk melanjutkan: " answer
  [[ "$answer" == "RESTORE" ]] || { echo "Dibatalkan."; exit 1; }
fi

if [[ $DO_DB -eq 1 ]]; then
  # pastikan database bisa diakses
  if ! MYSQL_PWD="$DB_PASS" mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
      -e "USE \`$DB_NAME\`" >/dev/null 2>&1; then
    echo "ERROR: database '$DB_NAME' tidak dapat diakses user '$DB_USER'." >&2
    echo "Jika database belum ada, buat dulu sebagai admin MySQL:" >&2
    echo "  mysql -e \"CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\"" >&2
    echo "  mysql -e \"GRANT ALL ON $DB_NAME.* TO '$DB_USER'@'localhost';\"" >&2
    exit 1
  fi

  if [[ $SAFETY -eq 1 ]]; then
    TS="$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_ROOT"
    SAFETY_FILE="$BACKUP_ROOT/pre-restore-$TS.sql.gz"
    echo "==> Safety backup database saat ini -> $SAFETY_FILE"
    MYSQL_PWD="$DB_PASS" mysqldump \
      --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
      --single-transaction --quick --routines --triggers \
      --default-character-set=utf8mb4 --no-tablespaces \
      "$DB_NAME" | gzip -9 > "$SAFETY_FILE"
  fi

  echo "==> Restore database"
  gunzip -c "$SRC/database.sql.gz" | MYSQL_PWD="$DB_PASS" mysql \
    --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
    --default-character-set=utf8mb4 "$DB_NAME"
  echo "    Database OK"
fi

if [[ $DO_PROJECT -eq 1 ]]; then
  echo "==> Restore file project (kecuali node_modules/.next/.venv/backups)"
  tar -xzf "$SRC/project.tar.gz" -C "$ROOT" --overwrite
  echo "    Project OK"
fi

cat <<'EOF'

Selesai.

Langkah setelah restore:
  1. Backend : cd backend && .venv/bin/alembic upgrade head
  2. Backend : restart service uvicorn (jika berjalan)
  3. Frontend: cd frontend && npm install && npm run build (bila node_modules/.next tidak ikut)
EOF
