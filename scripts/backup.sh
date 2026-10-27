#!/usr/bin/env bash
# Sao lưu CSDL VTPH_Coffee (NFR-013): chạy 2 lần/ngày bằng cron (xem scripts/README.md), giữ 30 bản gần nhất.
#
# Biến môi trường (đều có mặc định):
#   DB_NAME             tên CSDL                         (VTPH_Coffee)
#   BACKUP_DIR          thư mục chứa bản sao lưu         (/var/backups/vtph)
#   KEEP                số bản giữ lại, tối thiểu 30     (30)
#   MYSQL_DEFAULTS_FILE file cấu hình chứa user/mật khẩu của tài khoản sao lưu (nên đặt, chmod 600)
set -euo pipefail

DB_NAME=${DB_NAME:-VTPH_Coffee}
BACKUP_DIR=${BACKUP_DIR:-/var/backups/vtph}
KEEP=${KEEP:-30}

case "$KEEP" in ''|*[!0-9]*) echo "KEEP phải là số nguyên" >&2; exit 2;; esac
if [ "$KEEP" -lt 30 ] && [ "${ALLOW_LOW_KEEP:-0}" != "1" ]; then
  echo "KEEP=$KEEP nhỏ hơn 30 (NFR-013 yêu cầu giữ tối thiểu 30 bản)" >&2; exit 2
fi

defaults=()
[ -n "${MYSQL_DEFAULTS_FILE:-}" ] && defaults=(--defaults-extra-file="$MYSQL_DEFAULTS_FILE") # phải đứng đầu tiên

mkdir -p "$BACKUP_DIR"
umask 077
stamp=$(date +%Y%m%d-%H%M%S)
final="$BACKUP_DIR/${DB_NAME}_${stamp}.sql.gz"
partial="$final.partial"
trap 'rm -f "$partial"' EXIT

# --single-transaction: bản chụp nhất quán mà không khóa bảng khi quán đang bán hàng.
mysqldump "${defaults[@]}" --single-transaction --routines --triggers --events --no-tablespaces \
  --default-character-set=utf8mb4 "$DB_NAME" | gzip -9 > "$partial"

gzip -t "$partial"
# Bản sao lưu hợp lệ phải có định nghĩa bảng; tránh coi một tệp rỗng/lỗi là thành công.
# Dùng `grep -c` (đọc hết đầu vào) thay vì `grep -q`: với pipefail, grep -q thoát sớm làm gzip nhận SIGPIPE
# và pipeline báo lỗi ngẫu nhiên dù bản sao lưu hoàn toàn đúng.
tables_found=$(gzip -dc "$partial" | grep -c 'CREATE TABLE' || true)
if [ "${tables_found:-0}" -lt 1 ]; then
  echo "Bản sao lưu không chứa CREATE TABLE, hủy" >&2; exit 1
fi
mv "$partial" "$final"
trap - EXIT
echo "đã sao lưu: $final ($(du -h "$final" | cut -f1))"

# Xoay vòng: giữ $KEEP bản mới nhất của CSDL này.
ls -1t "$BACKUP_DIR/${DB_NAME}_"*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f -- "$old" && echo "đã xóa bản cũ: $old"
done
