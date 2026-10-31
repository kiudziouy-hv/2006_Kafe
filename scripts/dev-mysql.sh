#!/usr/bin/env bash
# Chạy đầy đủ chức năng: MySQL 8.4 (Docker) + backend profile "mysql" + giao diện. Nhấn Ctrl+C để dừng backend và giao diện
# (container MySQL vẫn chạy; dừng hẳn bằng: docker stop vtph-mysql).
# Cổng có thể đổi bằng biến môi trường: DB_PORT (mặc định 3307), SERVER_PORT (mặc định 8080).
# Mỗi lần chạy, cơ sở dữ liệu được dựng lại từ đầu: chỉ có dữ liệu nền (thực đơn, kho, nhân viên, bàn...), luồng nghiệp vụ
# (đơn, hóa đơn, ca, chấm công) rỗng và tồn kho về mức ban đầu, để tự thao tác luồng khi test/demo.
# Muốn giữ dữ liệu của lần chạy trước: KEEP_DATA=1 scripts/dev-mysql.sh
# Muốn có sẵn đơn mẫu của ngày hôm nay: SPRING_FLYWAY_TARGET=latest scripts/dev-mysql.sh
export SPRING_FLYWAY_TARGET="${SPRING_FLYWAY_TARGET:-4}"
set -euo pipefail
cd "$(dirname "$0")/.."
DB_PORT="${DB_PORT:-3307}"
SERVER_PORT="${SERVER_PORT:-8080}"
DB_PASSWORD="${DB_PASSWORD:-vtphpw}"

FRESH=0
if [ -z "$(docker ps -aq -f name=^vtph-mysql$)" ]; then
  FRESH=1
  docker run -d --name vtph-mysql -e MYSQL_ROOT_PASSWORD=rootpw -e MYSQL_DATABASE=VTPH_Coffee -e MYSQL_USER=vtph \
    -e MYSQL_PASSWORD="$DB_PASSWORD" -p "127.0.0.1:${DB_PORT}:3306" -v vtph_mysql_data:/var/lib/mysql \
    mysql:8.4 --log-bin-trust-function-creators=1 --character-set-server=utf8mb4 >/dev/null
else
  docker start vtph-mysql >/dev/null
fi
printf 'Đợi MySQL sẵn sàng'
until docker exec vtph-mysql mysqladmin ping -h localhost -prootpw --silent 2>/dev/null; do printf '.'; sleep 2; done
echo

# Dựng lại cơ sở dữ liệu trống để Flyway nạp lại dữ liệu nền (bỏ qua nếu container vừa tạo hoặc đặt KEEP_DATA=1).
if [ "$FRESH" = 0 ] && [ "${KEEP_DATA:-0}" != 1 ]; then
  echo "Đặt lại dữ liệu: luồng nghiệp vụ rỗng (giữ dữ liệu cũ: KEEP_DATA=1 scripts/dev-mysql.sh)"
  docker exec vtph-mysql mysql -uroot -prootpw -e \
    "DROP DATABASE IF EXISTS VTPH_Coffee; CREATE DATABASE VTPH_Coffee DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci;" 2>/dev/null
fi

[ -d frontend/node_modules ] || npm --prefix frontend install
# Ảnh món và topping nằm trong backend/uploads (được commit cùng mã nguồn); dùng đường dẫn tuyệt đối để không phụ thuộc thư mục chạy.
UPLOADS_DIR="$(pwd -W 2>/dev/null || pwd)/backend/uploads" SPRING_PROFILES_ACTIVE=mysql DB_HOST=127.0.0.1 DB_PORT="$DB_PORT" DB_USER=vtph DB_PASSWORD="$DB_PASSWORD" \
  LEGACY_DEMO_HASH=true SERVER_PORT="$SERVER_PORT" mvn -q -f backend/pom.xml spring-boot:run &
BACK=$!
trap 'kill $BACK 2>/dev/null || true' EXIT
VITE_BACKEND_URL="http://localhost:${SERVER_PORT}" npm --prefix frontend run dev
