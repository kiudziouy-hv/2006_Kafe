# 2006 Kafé — Hệ thống quản lý quán cà phê (VTPH Coffee, nhóm N15 – TDTU)

Đồ án RAD nhóm N15 (TDTU). Hệ thống dùng trên ba loại thiết bị: điện thoại của **Phục vụ**, máy **Thu ngân** và màn hình **Pha chế**; **Chủ quán/Quản lý** dùng máy tính.

| Phần | Công nghệ | Thư mục |
|---|---|---|
| Backend | Java 21, Spring Boot 3.3, Spring Security (phiên cookie), WebSocket/STOMP, Flyway, springdoc | `backend/` |
| Giao diện | React 19, TypeScript (strict), Vite, Tailwind 4, React Router, TanStack Query, React Hook Form + Zod | `frontend/` |
| Cơ sở dữ liệu | MySQL 8.4 (lược đồ, trigger, thủ tục của Chương 5) | `database/` |
| Giao diện tĩnh cũ | HTML/JS thuần của "Đợt 1", vẫn phục vụ ở `/` | `backend/src/main/resources/static/` |

## Trạng thái hiện tại (đọc trước khi tiếp tục)

- **Đầy đủ chức năng cần MySQL.** Profile `mysql` chạy trên MySQL 8.4 thật (Flyway dựng lược đồ Chương 5 và nạp dữ liệu mẫu) và cài đặt đủ 34 use case của RAD (UC-01..UC-34): đăng nhập/phiên, hồ sơ cá nhân, nhân viên và tài khoản, thực đơn/topping/khuyến mãi, sơ đồ bàn, gọi món/gọi thêm/chuyển bàn/hủy món, đơn mang đi (tiền mặt và chuyển khoản/QR có đơn nháp), pha chế, kho (nguyên liệu, công thức, nhập kho, kiểm kê, hao hụt, cảnh báo), thanh toán (khuyến mãi → điểm → làm tròn 500đ → tích điểm), hóa đơn (in 80 mm, in lại, hủy, hoàn tiền một phần/toàn bộ có xác nhận), thành viên và điểm, chấm công và chỉnh sửa chấm công, mở/chốt ca (Chủ quán chốt thay được), chốt ngày, báo cáo doanh thu, thông báo thời gian thực.
- **Chế độ giả lập (không profile)** vẫn chạy được không cần MySQL nhưng chỉ có luồng gọi món → pha chế → thanh toán cơ bản trong bộ nhớ (`OpsService` bản `InMemoryOpsService`); các màn quản trị (thực đơn, kho, hóa đơn, nhân sự, báo cáo...) trả 404 ở chế độ này.
- **Chưa làm (Level 2/FUTURE trong RAD):** xuất Excel, dashboard, báo cáo theo khung giờ (FR-M11-007..009). Hoàn tiền không chuyển qua ngân hàng: Chủ quán trả tiền ngoài hệ thống rồi xác nhận trên hệ thống (BR-033).
- **Chưa kiểm chứng:** `docker compose up` (chưa chạy).

## Chạy nhanh

Cần: Java 21, Maven, Node 22+ và Docker (cho MySQL).

```bash
scripts/dev-mysql.sh   # MySQL (Docker, cổng 3307) + backend (8080) + giao diện (http://localhost:5173)
```

Đổi cổng backend nếu 8080 đang bị chiếm: `SERVER_PORT=8081 scripts/dev-mysql.sh`. Chạy thủ công từng phần và chế độ giả lập: xem [docs/development/setup.md](docs/development/setup.md).

Tài khoản mẫu (profile `mysql` + dữ liệu mẫu, cần `LEGACY_DEMO_HASH=true`, script đã bật):

| Vai trò | Cách đăng nhập | Thông tin |
|---|---|---|
| Chủ quán / Quản lý | tab **Quản lý** | `owner` / `admin123` (Huỳnh Thị Kiều Vy) |
| Phục vụ (Võ Tấn Phát, Võ Thị Em...) | tab **Nhân viên** → Phục vụ | PIN `123456` |
| Thu ngân (Hồ Quốc Tiên, Lê Hoàng Cường) | tab **Nhân viên** → Thu ngân | PIN `234567` |
| Pha chế (Trần Thanh Huy, Đặng Thị Giang) | tab **Nhân viên** → Pha chế | PIN `345678` |

Thành viên mẫu để thử điểm: `0912345678` (24 điểm). Sai PIN 5 lần thì khóa 15 phút (BR-042). Thu ngân và Pha chế tự đăng xuất sau 5 phút không thao tác (UC-02). Chấm công vào/ra: liên kết "Chấm công" ở màn đăng nhập (`/attendance`).

Chế độ giả lập: `mvn -f backend/pom.xml spring-boot:run` và `npm --prefix frontend run dev`, tài khoản `chuquan` / `Quan@2026`, PIN Phục vụ `123456`, Thu ngân `234567`, Pha chế `345678` (xem `backend/src/main/resources/mock-accounts.json`).

## Kiểm thử

```bash
mvn -f backend/pom.xml test     # 47 test backend (cần Docker cho các test MySQL, tự bỏ qua nếu không có)
npm --prefix frontend run test  # 16 test giao diện
npm --prefix frontend run lint && npm --prefix frontend run typecheck
```

## Tài liệu

- [Tổng quan kiến trúc](docs/architecture/system-overview.md), [quyết định kiến trúc](docs/architecture/architecture-decisions.md), [luồng thời gian thực](docs/architecture/realtime-flow.md)
- [Quy ước API](docs/api/api-conventions.md), [cơ sở dữ liệu](docs/database/data-dictionary.md), [yêu cầu](docs/requirements/README.md)
- [Cài đặt](docs/development/setup.md), [quy ước mã nguồn](docs/development/coding-conventions.md), [quy trình nhóm](docs/development/team-workflow.md), [chiến lược kiểm thử](docs/testing/test-strategy.md)
- Swagger UI khi backend chạy: http://localhost:8080/swagger-ui.html (cần đăng nhập trước nếu gọi thử API được bảo vệ)
