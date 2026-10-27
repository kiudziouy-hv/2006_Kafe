#!/usr/bin/env bash
# Nạp toàn bộ CSDL VTPH_Coffee theo đúng thứ tự (00 → 06).
#
#   ./load.sh -uroot -p                          # nạp đầy đủ, gồm dữ liệu giao dịch mẫu (05)
#   SKIP_SAMPLE_TRANSACTIONS=1 ./load.sh -uroot -p   # bỏ 05: chỉ danh mục, không có đơn/hóa đơn giả
#
# Mọi tham số được chuyển thẳng cho lệnh `mysql` (ví dụ -h, -P, -u, -p).
# CẢNH BÁO: 01_schema.sql xóa và tạo lại toàn bộ bảng. Không chạy trên CSDL đang có dữ liệu thật.
set -euo pipefail
cd "$(dirname "$0")"

mysql "$@" < 00_create_database.sql
for f in 01_schema 02_triggers 03_seed_master 04_views_procedures 05_seed_transactions 06_backend_additions; do
  if [ "$f" = "05_seed_transactions" ] && [ "${SKIP_SAMPLE_TRANSACTIONS:-0}" = "1" ]; then
    echo "bỏ qua $f"
    continue
  fi
  echo "nạp $f"
  mysql "$@" --default-character-set=utf8mb4 VTPH_Coffee < "$f.sql"
done
echo "xong"
