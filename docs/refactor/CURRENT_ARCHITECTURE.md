# Kiến trúc hiện tại của backend (khảo sát, chưa thay đổi gì)

Ngày khảo sát: 2026-10-26. Phạm vi: `backend/` (Java), đối chiếu với `database/` và `frontend/` khi cần.
Quy ước: **[Đã xác minh]** = đọc trực tiếp từ mã/lược đồ/chạy thử; **[Giả thuyết]** = suy luận, chưa kiểm chứng.

## 1. Công nghệ [Đã xác minh]

| Hạng mục | Giá trị |
|---|---|
| Java / build | Java 21, Maven, `spring-boot-starter-parent` 3.3.5 |
| Web | Spring MVC (`spring-boot-starter-web`), Spring Security (phiên bằng cookie `VTPHSESSION`), WebSocket/STOMP, Actuator, springdoc-openapi 2.6.0 |
| Truy cập dữ liệu | `spring-boot-starter-jdbc` (JdbcTemplate). **Không** dùng JPA/Hibernate hay MyBatis |
| CSDL | MySQL 8.4; Flyway (`flyway-core`, `flyway-mysql`) |
| Kiểm thử | JUnit 5, Spring Boot Test, Testcontainers MySQL 8.4 |
| Quy mô mã | 4.372 dòng Java trong `src/main` tại thời điểm khảo sát (55 tệp, trong đó 44 tệp mã và 11 `package-info`); sau bước 1 thêm gói `shared` |
| Số điểm cuối REST | khoảng 86 ánh xạ (`@Get/Post/Put/...Mapping`) trong 12 controller |

Không có công cụ phân tích tĩnh/định dạng (Checkstyle, Spotless, SpotBugs, Sonar...) trong `pom.xml` [Đã xác minh].

## 2. Cấu trúc gói (`vn.vtph.coffee`)

Kiểu tổ chức: **package-by-feature**, một ứng dụng đơn khối (modular monolith). Mỗi gói thường chứa Controller + Service (+ vài lớp phụ) cùng nhau; không có tầng domain riêng.

| Gói | Vai trò | Lớp chính (dòng) |
|---|---|---|
| `ops` | Bàn, đơn tại quán, đơn mang đi, bếp, ca thu ngân, thanh toán, đơn nháp | `JdbcOpsService` (955), `InMemoryOpsService` (418), `OpsController` (80), `OpsService`, `Model`, `OpsException` |
| `payment` | Hóa đơn: danh sách, hủy, hủy dòng món đơn mang đi, hoàn tiền | `InvoiceService` (246), `InvoiceController` |
| `inventory` | Nguyên liệu, công thức, nhập kho, kiểm kê, hao hụt, cảnh báo | `InventoryService` (256), `InventoryController` |
| `menu` | Món, topping, ảnh món | `MenuAdminService` (216), `MenuAdminController`, `MenuImageStore`, `MenuImageController` |
| `staff` | Nhân viên/tài khoản, chấm công | `StaffService`, `AttendanceService`, 2 controller |
| `auth` | Đăng nhập, khóa tài khoản, kho tài khoản | `AuthService`, `AuthController`, `AccountStore` + `JdbcAccountStore`/`InMemoryAccountStore` |
| `customer` | Thành viên, điểm | `CustomerService`, `CustomerController` |
| `promotion` | Khuyến mãi | `PromotionService`, `PromotionController` |
| `report` | Báo cáo doanh thu | `ReportService`, `ReportController` |
| `shift` | Chốt ngày kinh doanh | `DayService`, `DayController` |
| `notification` | Cầu nối sự kiện → STOMP | `NotificationBridge` |
| `config` | Security, WebSocket | `SecurityConfig`, `WebSocketConfig` |
| `shared` | (mới, bước 1 refactor) `shared.pricing.PricingPolicy`: quy tắc tính tiền/điểm thuần Java |
| `common` | Truy cập DB, kiểm tra quyền, xử lý lỗi | `Db`, `Access`, `ApiExceptionAdvice`, `GlobalExceptionHandler` |
| `web` | Health | `HealthController` |
| `table`, `kitchen`, `takeaway` | **Chỉ có `package-info.java`** (mô tả), không có mã; mã tương ứng nằm trong `ops` |

## 3. Hai chế độ chạy (profile) [Đã xác minh]

- **`mysql`** (đầy đủ chức năng): mọi service/controller ở trên đều gắn `@Profile("mysql")`.
- **mặc định (không có CSDL)**: chỉ còn `InMemoryOpsService` + `InMemoryAccountStore` (dữ liệu giả); các module quản trị, thanh toán hóa đơn, kho, báo cáo, chốt ngày **không tồn tại**. `OpsService` là giao diện có hai cài đặt (`JdbcOpsService`, `InMemoryOpsService`).
- Dữ liệu mẫu nằm ở thư mục `db/seed` và nạp cùng `db/migration` qua cấu hình `spring.flyway.locations` (mặc định nạp cả hai).

## 4. Luồng xử lý điển hình [Đã xác minh]

`HTTP → Controller (kiểm tra phiên/vai trò bằng Access.who) → Service (@Transactional, SQL bằng JdbcTemplate/Db) → MySQL (ràng buộc + trigger)`.
Sự kiện vận hành: service gọi `ApplicationEventPublisher.publishEvent(OpsEvent)` → `NotificationBridge` (`@TransactionalEventListener(fallbackExecution = true)`) → `SimpMessagingTemplate` gửi tới `/topic/kitchen|service|cashier`.

Quy tắc nghiệp vụ nằm **ở ba nơi**: Java service (phần lớn), trigger/ràng buộc MySQL (ví dụ chặn UPDATE hóa đơn, một đơn mở mỗi bàn, một ca mở), và procedure `sp_start_making`.

## 5. Bảo mật và cấu hình [Đã xác minh]

- Spring Security: mọi `/api/**`, `/ws/**`, `/actuator/**` cần đăng nhập, ngoại trừ `/api/auth/**`, `/api/health`, `/actuator/health|info`, và **Swagger/OpenAPI (`/v3/api-docs/**`, `/swagger-ui/**`) luôn mở công khai**.
- CSRF tắt (ADR-004: cookie `SameSite=Lax` + CORS theo danh sách nguồn); cookie `HttpOnly`; đổi mã phiên sau đăng nhập (`changeSessionId`).
- Phân quyền theo vai trò thực hiện **thủ công trong controller** (`who(session, Role...)`) và một phần trong service (ví dụ hủy món đang pha: so `Account.role`). Chủ quán kế thừa mọi quyền (`Access.who`).
- bcrypt (độ khó 10) cho PIN và mật khẩu; cờ `vtph.auth.legacy-demo-hash` chấp nhận băm SHA-256 của dữ liệu mẫu rồi nâng cấp lên bcrypt.
- Mật khẩu CSDL lấy từ biến môi trường `DB_PASSWORD` (mặc định rỗng). Không có cấu hình pool riêng (dùng mặc định HikariCP).
- Tải ảnh: `vtph.uploads.dir` (mặc định thư mục tương đối `uploads`), giới hạn multipart 6 MB, loại JPG/PNG/WebP.

## 6. Xử lý lỗi [Đã xác minh]

Bốn nơi xử lý ngoại lệ song song: `ApiExceptionAdvice` (`HIGHEST_PRECEDENCE`), `GlobalExceptionHandler`, `OpsController.onOps`, `AuthController.onAuth`. Cùng khuôn trả về `{code, message, ...}` nhưng khai báo ở nhiều chỗ.

## 7. Kiểm thử [Đã xác minh]

50 test: 3 lớp tích hợp trên MySQL thật (Testcontainers: `MySqlAuthIntegrationTest`, `MySqlAdminIntegrationTest`, `MySqlOpsIntegrationTest`) + 4 lớp chạy không cần CSDL (`AuthServiceTest`, `AccessAndRealtimeTest`, `NotificationBridgeTest`, `NotificationAfterCommitTest`). Chạy lần cuối: `Tests run: 50, Failures: 0`. Không có kiểm thử hợp đồng API riêng, không có kiểm thử đơn vị cho tính toán giá/điểm (chỉ được kiểm qua tích hợp).

## 8. Điều chưa xác minh

- Chưa có dữ liệu tải thật; số đo hiệu năng chỉ trên dữ liệu mẫu nhỏ (xem `TECHNICAL_DEBT.md`, mục Hiệu năng).
- Chưa kiểm tra các hệ thống tích hợp ngoài: mã không có email/thanh toán/lưu trữ bên thứ ba [Đã xác minh: không thấy dependency tương ứng].
