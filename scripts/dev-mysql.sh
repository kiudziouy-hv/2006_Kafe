#!/usr/bin/env bash
# Chạy đầy đủ chức năng: MySQL 8.4 (Docker) + backend profile "mysql" + giao diện. Nhấn Ctrl+C để dừng backend và giao diện
# (container MySQL và dữ liệu vẫn giữ; dừng hẳn bằng: docker stop vtph-mysql).
# Cổng có thể đổi bằng biến môi trường: DB_PORT (mặc định 3307), SERVER_PORT (mặc định 8080).
# Mặc định chỉ nạp dữ liệu nền (thực đơn, kho, nhân viên, bàn...), KHÔNG nạp đơn mẫu để tự thao tác luồng từ đầu khi demo.
# Muốn có sẵn đơn mẫu của ngày hôm nay: đặt SPRING_FLYWAY_TARGET=latest trên cơ sở dữ liệu trống
# (xóa dữ liệu cũ: docker rm -f vtph-mysql && docker volume rm vtph_mysql_data).
export SPRING_FLYWAY_TARGET="${SPRING_FLYWAY_TARGET:-4}"
set -euo pipefail
cd "$(dirname "$0")/.."
DB_PORT="${DB_PORT:-3307}"
SERVER_PORT="${SERVER_PORT:-8080}"
DB_PASSWORD="${DB_PASSWORD:-vtphpw}"

if [ -z "$(docker ps -aq -f name=^vtph-mysql$)" ]; then
  docker run -d --name vtph-mysql -e MYSQL_ROOT_PASSWORD=rootpw -e MYSQL_DATABASE=VTPH_Coffee -e MYSQL_USER=vtph \
    -e MYSQL_PASSWORD="$DB_PASSWORD" -p "127.0.0.1:${DB_PORT}:3306" -v vtph_mysql_data:/var/lib/mysql \
    mysql:8.4 --log-bin-trust-function-creators=1 --character-set-server=utf8mb4 >/dev/null
else
  docker start vtph-mysql >/dev/null
fi
printf 'Đợi MySQL sẵn sàng'
until docker exec vtph-mysql mysqladmin ping -h localhost -prootpw --silent 2>/dev/null; do printf '.'; sleep 2; done
echo

[ -d frontend/node_modules ] || npm --prefix frontend install
# Ảnh món và topping nằm trong backend/uploads (được commit cùng mã nguồn); dùng đường dẫn tuyệt đối để không phụ thuộc thư mục chạy.
UPLOADS_DIR="$(pwd -W 2>/dev/null || pwd)/backend/uploads" SPRING_PROFILES_ACTIVE=mysql DB_HOST=127.0.0.1 DB_PORT="$DB_PORT" DB_USER=vtph DB_PASSWORD="$DB_PASSWORD" \
  LEGACY_DEMO_HASH=true SERVER_PORT="$SERVER_PORT" mvn -q -f backend/pom.xml spring-boot:run &
BACK=$!
trap 'kill $BACK 2>/dev/null || true' EXIT
VITE_BACKEND_URL="http://localhost:${SERVER_PORT}" npm --prefix frontend run dev
