# Quyết định kiến trúc (ADR)

## ADR-001 Giữ backend Spring Boot hiện có, không viết lại
Mã "Đợt 1" đã có đăng nhập, phân quyền, toast, tài khoản giả lập và các nghiệp vụ gọi món/pha chế/thanh toán kèm kiểm tra business rule. Khung mới được **thêm vào** (Security, WebSocket, Flyway, test, giao diện React), không thay thế.

## ADR-002 Dùng MySQL 8.4, không dùng PostgreSQL
Lược đồ Chương 5 (28 bảng, 15 trigger, thủ tục, 35 kịch bản kiểm thử) đã viết và kiểm thử trên MySQL, và là nội dung Chương 5 của báo cáo. Đổi sang PostgreSQL phải viết lại trigger/thủ tục và mất kết quả kiểm thử đã có. Kiến trúc không phụ thuộc MySQL ngoài thư mục `database/` và cấu hình `application-mysql.properties`.

## ADR-003 Phiên cookie, không dùng JWT
`AuthController` đã dùng phiên máy chủ. Phiên hợp với yêu cầu tự đăng xuất 5 phút (`session.maxInactiveInterval = 300` cho Thu ngân/Pha chế), thu hồi tức thì khi đăng xuất, và dùng lại được cho WebSocket. JWT thêm độ phức tạp (làm mới, thu hồi) mà chưa có nhu cầu (không có ứng dụng di động gốc hay dịch vụ ngoài).
Hệ quả: chạy nhiều bản backend cần lưu phiên ngoài (Spring Session).

## ADR-004 Tắt CSRF cho API JSON
Cookie đặt `HttpOnly` và `SameSite=Lax`, CORS chỉ cho phép các nguồn khai báo trong `vtph.cors.allowed-origins`, và mọi API ghi dùng `POST` với JSON. Rủi ro còn lại: nếu sau này cho phép nhúng chéo site hoặc hạ `SameSite`, phải bật lại CSRF token.

## ADR-005 STOMP với simple broker trong bộ nhớ
Đủ cho một quán, không cần hạ tầng thêm. Xem giới hạn một máy chủ ở `realtime-flow.md`.

## ADR-006 Chuyển nghiệp vụ sang MySQL theo từng use case (bước 1, 2 xong)
Kế hoạch:
1. **Xong:** `AuthService` dùng `AccountStore` (`JdbcAccountStore` ở profile `mysql`, `InMemoryAccountStore` ở chế độ giả lập), băm bcrypt, lưu khóa tạm vào `failed_attempts`/`locked_until`/`status`. Dữ liệu mẫu băm SHA-256 được nâng lên bcrypt ở lần đăng nhập đúng đầu tiên khi bật `vtph.auth.legacy-demo-hash` (chỉ dev). Dùng `JdbcTemplate`, chưa thêm JPA.
   Còn thiếu: khóa tạm hiện chỉ an toàn với một bản backend (`AuthService.check` dùng `synchronized`); nhiều bản cần cập nhật nguyên tử bằng SQL. Chưa có API đặt lại PIN/khóa tài khoản (UC-04).
2. **Xong:** `OpsService` thành interface; `InMemoryOpsService` (mặc định) và `JdbcOpsService` (profile `mysql`) cùng hợp đồng API. Bản MySQL dùng `dining_table`, `menu_item`/`item_size`/`topping`, `orders`/`dine_in_order`/`takeaway_order`/`order_batch`/`order_line`, và cả `ingredient`/`recipe` (kho), `cashier_session`, `invoice` vì vòng đời đơn không tách rời được chúng. Pha chế gọi thủ tục `sp_start_making`; mỗi thao tác là một giao dịch và sự kiện thời gian thực chỉ gửi sau commit.
   Khác biệt có chủ đích: chưa áp khuyến mãi/điểm; không lưu tiền khách đưa; `orders.status` DONE nghĩa là mọi dòng đã xong (đã "Chờ thanh toán" với đơn tại quán), "PAID" ở API suy ra từ việc có hóa đơn; giờ lưu UTC; người thao tác truyền vào dạng `Account` để ghi đúng `created_by`/`issued_by`.
   Còn thiếu: dữ liệu mẫu và dữ liệu giả lập là hai bộ khác nhau (id món khác nhau); khóa dòng ở mức `SELECT … FOR UPDATE` theo bàn/đơn nhưng chưa có test đồng thời.3. Tiếp theo: thêm các module `invoice` (in lại, hủy), `refund`, `inventory`, `staff`, `report`, khuyến mãi/điểm.

Cách truy cập dữ liệu: bước 1 dùng `JdbcTemplate` (SQL rõ ràng, khớp trigger MySQL). Nếu sang bước 2 thấy cần ánh xạ đối tượng phức tạp thì cân nhắc Spring Data JPA và ghi lại ở đây; hiện chưa thêm dependency JPA để tránh mã thừa.
Trigger của MySQL là lớp bảo vệ thứ hai; business rule vẫn phải kiểm tra ở service để báo lỗi rõ cho người dùng.

## ADR-007 Flyway sinh từ `database/*.sql`
`database/` vẫn là nguồn chuẩn của Chương 5. `scripts/sync-migrations.py` sinh `db/migration` (V1 lược đồ, V2 trigger, V4 view/thủ tục) và `db/seed` (V3, V5 dữ liệu mẫu, chỉ nạp ở môi trường phát triển). CI chạy `python3 scripts/sync-migrations.py --check` (cũng chạy được ở máy: `make check-sql`) và báo lỗi nếu tệp Flyway khác nội dung sinh ra từ `database/`. Quy ước: **chỉ sửa `database/*.sql`, không sửa tay `backend/.../db/`**.
