# Chiến lược kiểm thử

| Tầng | Công cụ | Nội dung | Hiện có |
|---|---|---|---|
| Đơn vị backend | JUnit 5 | `AuthService` (kho bộ nhớ): khóa sau 5 lần sai (BR-042), định dạng PIN, đặt lại bộ đếm; `NotificationBridge`: định tuyến kênh | 9 test |
| Tích hợp backend | Spring Boot Test, MockMvc, `@RecordApplicationEvents` | 401 khi chưa đăng nhập, 403 sai vai trò, đăng xuất, thứ tự sự kiện gửi đơn → bắt đầu pha → hoàn thành | 4 test |
| Tích hợp MySQL | Testcontainers (mysql:8.4), một container dùng chung | Flyway dựng 28 bảng/15 trigger/dữ liệu mẫu; đăng nhập từ bảng `account` (bcrypt, khóa tạm lưu CSDL) | 8 test (cần Docker) |
| Nghiệp vụ trên MySQL | như trên, qua MockMvc | Bàn/thực đơn từ CSDL; gửi đơn ghi đủ order/batch/line/topping; gọi thêm; hủy theo vai trò; bánh trừ/hoàn kho; chuyển bàn; pha chế qua `sp_start_making` và thiếu nguyên liệu đánh dấu Hết hàng bền vững; chờ thanh toán → hóa đơn → bàn trống; mang đi tiền mặt/chuyển khoản/đơn nháp; chốt ca; trường JSON khớp mô hình; trigger vẫn chặn khi qua mặt service | 12 test (cần Docker) |
| Hợp đồng sự kiện | Spring Test, không Mockito | Chỉ gửi sau commit, rollback không gửi, không có giao dịch thì gửi ngay | 3 test |
| Đơn vị / thành phần giao diện | Vitest, React Testing Library | Bàn phím PIN, form đăng nhập (kiểm tra, sai PIN, bị khóa), `RequireRole`, định dạng tiền | 11 test |
| Quy tắc dữ liệu | `database/run_tests.py` (cần MySQL) | 35 kịch bản trigger/ràng buộc | Chạy riêng, chưa tích hợp CI |
| Thủ công | Trình duyệt + curl | Luồng Phục vụ ↔ Pha chế qua WebSocket | Đã chạy một lần |

## Chưa có (nên làm tiếp)
- Chạy `database/run_tests.py` (35 kịch bản trigger) trên CSDL do Flyway dựng.
- Test đồng thời (hai Phục vụ gửi đơn cùng một bàn, hai Thu ngân thanh toán cùng một đơn) cho `JdbcOpsService`.
- Test STOMP thật qua WebSocket với MySQL.
- Test STOMP thật: từ chối đăng ký kênh sai vai trò.
- Test giao diện cho bảng pha chế, trang thanh toán, trang bàn.
- Kiểm thử đầu-cuối (Playwright) cho luồng gọi món → pha chế → thanh toán.

## Chạy
```bash
mvn -f backend/pom.xml test
npm --prefix frontend run test
```
