# Cài đặt môi trường

## Yêu cầu
Java 21, Maven 3.9+, Node 22+ và npm. Docker (tùy chọn, để chạy cả hệ thống). MySQL 8.4 nếu không dùng Docker.
Kiểm tra nhanh: `bash scripts/check-environment.sh`.

## 1. Chế độ giả lập (không cần MySQL) — dùng hằng ngày
```bash
mvn -f backend/pom.xml spring-boot:run  # http://localhost:8080
npm --prefix frontend install
npm --prefix frontend run dev       # http://localhost:5173
```
Vite chuyển tiếp `/api` và `/ws` sang backend. Backend ở cổng khác (ví dụ 8081): tạo `frontend/.env.local` chứa `VITE_BACKEND_URL=http://localhost:8081`.
Hoặc chạy một lệnh: `bash scripts/dev-start.sh` (Windows: `scripts\dev-start.bat`).

## 2. Với MySQL (đầy đủ chức năng)

Cách nhanh nhất: `scripts/dev-mysql.sh` (tự chạy container `vtph-mysql` cổng 3307, backend và giao diện). Cách thủ công:
1. Tạo CSDL và tài khoản (xem [database/README.md](../../database/README.md)).
2. Đặt biến môi trường, **không ghi mật khẩu vào tệp được commit**:
   ```bash
   export SPRING_PROFILES_ACTIVE=mysql DB_USER=vtph DB_PASSWORD='<mật khẩu>'
   mvn -f backend/pom.xml spring-boot:run
   ```
   Flyway dựng lược đồ và nạp dữ liệu mẫu ở lần chạy đầu. Đăng nhập và toàn bộ gọi món/pha chế/thanh toán đọc ghi MySQL. Với dữ liệu mẫu, đặt thêm `LEGACY_DEMO_HASH=true` rồi dùng `owner`/`admin123` hoặc PIN `123456`. Thực đơn là 30 món của Chương 5 (ví dụ id 1 Cà phê đen, 24 Tiramisu).

## 3. Docker
```bash
cp .env.example .env     # điền DB_PASSWORD và DB_ROOT_PASSWORD
docker compose up --build
# giao diện: http://localhost:8088
```
Chưa chạy thử trong lần dựng khung này.

## Chạy test MySQL (Testcontainers)
Cần Docker đang chạy; `mvn -f backend/pom.xml test` tự bỏ qua 20 test này nếu không có Docker. Trên macOS với Docker Desktop, nếu thấy "Could not find a valid Docker environment": `export DOCKER_HOST=unix://$HOME/.docker/run/docker.sock`. Surefire đã đặt `-Dapi.version=1.44` vì Docker Desktop 29 từ chối API cũ.

## Xử lý sự cố
| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| Giao diện báo 502 ở `/api` | Backend chưa chạy hoặc `VITE_BACKEND_URL` sai cổng |
| Đăng nhập xong vẫn quay về `/login` | Cookie bị chặn: mở giao diện qua cùng một địa chỉ (localhost hoặc 127.0.0.1, không trộn) |
| `APPLICATION FAILED TO START` khi bật profile `mysql` | Sai `DB_*` hoặc MySQL chưa chạy |
