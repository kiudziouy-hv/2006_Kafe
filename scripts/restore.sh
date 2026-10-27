#!/usr/bin/env bash
# Khôi phục CSDL từ một bản sao lưu (NFR-014: khôi phục trong vòng 4 giờ).
#
#   scripts/restore.sh <file.sql.gz> --yes          # khôi phục vào DB_NAME (mặc định VTPH_Coffee)
#   DB_NAME=VTPH_Test scripts/restore.sh <file> --yes   # khôi phục sang CSDL khác để diễn tập
#
# CẢNH BÁO: toàn bộ dữ liệu hiện có trong CSDL đích bị thay bằng nội dung bản sao lưu.
# Hãy dừng backend trước khi khôi phục.
set -euo pipefail

file=${1:-}
confirm=${2:-}
DB_NAME=${DB_NAME:-VTPH_Coffee}

if [ -z "$file" ] || [ ! -f "$file" ]; then
  echo "Dùng: $0 <file.sql.gz> --yes" >&2; exit 2
fi
if [ "$confirm" != "--yes" ]; then
  echo "Thao tác này GHI ĐÈ CSDL '$DB_NAME'. Thêm --yes để xác nhận." >&2; exit 2
fi
gzip -t "$file"

defaults=()
[ -n "${MYSQL_DEFAULTS_FILE:-}" ] && defaults=(--defaults-extra-file="$MYSQL_DEFAULTS_FILE")

mysql "${defaults[@]}" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci"
# Xóa mọi bảng hiện có (không xóa chính CSDL) để bản khôi phục không bị lẫn dữ liệu cũ.
tables=$(mysql "${defaults[@]}" -N -B -e "SELECT CONCAT('\`',table_name,'\`') FROM information_schema.tables WHERE table_schema='$DB_NAME'" | paste -sd, -)
if [ -n "$tables" ]; then
  mysql "${defaults[@]}" "$DB_NAME" -e "SET FOREIGN_KEY_CHECKS=0; DROP TABLE IF EXISTS $tables; SET FOREIGN_KEY_CHECKS=1"
fi
gzip -dc "$file" | mysql "${defaults[@]}" --default-character-set=utf8mb4 "$DB_NAME"
echo "đã khôi phục '$DB_NAME' từ $file"
