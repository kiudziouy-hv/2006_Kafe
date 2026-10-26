# Cơ sở dữ liệu MySQL hiện tại (khảo sát, chưa thay đổi gì)

Nguồn: `database/01_schema.sql`, `02_triggers.sql`, `04_views_procedures.sql` (nguồn chuẩn), bản sao Flyway ở `backend/src/main/resources/db/` (sinh bằng `scripts/sync-migrations.py`). Ngày 2026-10-26.
**[Đã xác minh]** = đọc từ tệp SQL; **[Giả thuyết]** = chưa chạy `EXPLAIN` hay đo tải thật.

## 1. Tổng quan [Đã xác minh]

- MySQL 8.4, InnoDB, utf8mb4. 28 bảng, 42 khóa ngoại, 38 ràng buộc `CHECK`, 29 khóa/chỉ mục khai báo trong `CREATE TABLE`.
- 15 trigger, 5 view, 1 stored procedure (`sp_start_making`).
- Flyway: `V1__schema`, `V2__triggers`, `V4__views_procedures` ở `db/migration`; `V3__seed_master`, `V5__seed_transactions` ở `db/seed`. Cấu hình `spring.flyway.locations` nạp cả hai thư mục (nên dữ liệu mẫu chen giữa V2 và V4). Triển khai thật phải đặt `FLYWAY_LOCATIONS=classpath:db/migration`.
- `validate-on-migrate=true`: sửa nội dung tệp migration đã áp dụng làm Flyway báo lệch checksum (đã gặp khi đổi dữ liệu mẫu).

## 2. Nhóm bảng

| Nhóm | Bảng |
|---|---|
| Nhân sự | `employee`, `account`, `attendance`, `attendance_edit` |
| Ca và ngày | `business_day`, `cashier_session` |
| Thực đơn | `menu_item`, `item_size`, `topping`, `menu_item_topping`, `promotion` |
| Kho | `ingredient`, `recipe`, `recipe_line`, `stock_receipt`, `stock_adjustment`, `waste_record` |
| Khách hàng | `customer`, `point_transaction` |
| Đơn hàng | `dining_table`, `orders`, `dine_in_order`, `takeaway_order`, `order_batch`, `order_line`, `order_line_topping` |
| Thanh toán | `invoice`, `refund_record` |

## 3. Quy tắc nghiệp vụ đặt ngay trong CSDL [Đã xác minh]

| Cơ chế | Mục đích |
|---|---|
| `uq_one_open_session (open_flag)` | Tại mỗi thời điểm chỉ một phiên ca mở |
| `uq_one_open_order_per_table (open_table_id)` | Mỗi bàn tối đa một đơn mở |
| `uq_invoice_order (order_id)` | Một đơn chỉ thanh toán một lần (BR-029) |
| `uq_takeaway_queue (queue_date, queue_number)` | Số thứ tự đơn mang đi trong ngày |
| `uq_customer_phone` | Mỗi số điện thoại một thành viên (BR-024) |
| `trg_invoice_bu_immutable`, `trg_session_bu_close`, `trg_day_bu_close` | Hóa đơn/ca/ngày đã chốt không sửa |
| `trg_nodelete_*` (invoice, orders, order_line, refund, point_tx, session) | Cấm xóa |
| `trg_line_bu_transition` | Chặn chuyển trạng thái dòng món sai chu trình |
| `trg_receipt_bi_expiry` | Sữa tươi/bánh bắt buộc có hạn dùng (BR-017) |
| `sp_start_making` | Trừ kho đồ uống khi bắt đầu pha |
| `v_available_stock` | Tồn khả dụng = tồn hiện tại − lượng dự kiến của dòng món New (BR-008) |

Hệ quả [Đã xác minh]: nghiệp vụ được bảo vệ hai lớp (Java và CSDL); lỗi trigger (SQLSTATE 45000) được `ApiExceptionAdvice` đổi thành HTTP 409.

## 4. Chỉ mục hiện có (ngoài khóa chính)

`account(employee_id)`, `account(username)`; `attendance(employee_id, check_in_time)`; `cashier_session(business_date, shift)` + `open_flag`; `receipt(ingredient_id, expiry_date)`; `waste(ingredient_id)`; `adjustment(ingredient_id)`; `orders(status)`; `dine_in_order(open_table_id)`, `(table_id)`; `order_batch(order_id)`; `order_line(batch_id)`, `(status)`; `invoice(order_id)` unique, `(session_id)`, `(customer_id)`, `(issued_at)`; `refund_record(invoice_id)`; `point_transaction(customer_id, created_at)`; cùng các khóa duy nhất theo tên (món, topping, nguyên liệu, bàn...).

## 5. Truy vấn đáng chú ý (cần kiểm tra khi có dữ liệu lớn)

Tất cả là **[Giả thuyết]** về hiệu năng; chưa có `EXPLAIN` và dữ liệu mẫu quá nhỏ để kết luận.

| Truy vấn | Vị trí | Mối quan tâm |
|---|---|---|
| `NOT EXISTS (... JOIN v_available_stock ...)` cho từng kích thước/topping | `JdbcOpsService.SIZE_SQL`, `TOPPING_SQL`, gọi trong `menu()` và `buildLine` | `v_available_stock` tính `SUM` trên `order_line` (UNION ALL hai nhánh) mỗi lần dùng; có thể bị tính lại nhiều lần trong một yêu cầu |
| `kitchen()` | `JdbcOpsService.kitchen` | Với mỗi dòng món chạy thêm 2 truy vấn (topping + `shortage(lineId)`): dạng N+1 |
| `v_revenue_by_day`, `v_best_sellers` | `ReportService` | Quét `invoice`/`order_line` theo khoảng ngày; có chỉ mục `invoice(issued_at)` |
| Danh sách hóa đơn lọc theo tên/SĐT/mã | `InvoiceService.list` | Lọc `LIKE` nhiều cột; chưa có chỉ mục phù hợp cho tìm kiếm văn bản |
| `order_line.status` chỉ mục thấp chọn lọc | `ix_line_status` | Cột có ít giá trị phân biệt (NEW/MAKING/DONE/CANCELLED) |

## 6. Giao dịch và đồng thời [Đã xác minh]

- Service gắn `@Transactional`; `JdbcOpsService` khóa dòng bằng `SELECT ... FOR UPDATE` ở bàn, đơn, dòng món; trừ kho bánh bằng `UPDATE ... WHERE current_stock >= ?` (không bị đua).
- `JdbcOpsService.start` đặt `noRollbackFor = OpsException` để vẫn lưu dấu "Hết hàng" khi thiếu nguyên liệu.
- Mức cô lập: mặc định của MySQL (REPEATABLE READ) [Giả thuyết: chưa kiểm tra cấu hình máy chủ thật].
- Pool kết nối: cấu hình mặc định HikariCP, không tinh chỉnh [Đã xác minh].

## 7. Điểm cần xác minh về múi giờ [Giả thuyết]

URL JDBC khai báo `serverTimezone=Asia/Ho_Chi_Minh`, trong khi mã ghi giờ bằng `LocalDateTime.now(UTC)` (`Db.nowUtc`). Dữ liệu đang chạy đúng (các test về thời điểm đều đạt), nhưng cần làm rõ quy ước ghi/đọc `DATETIME` trước khi động vào cột thời gian.

## 8. Rủi ro dữ liệu đã biết

- Tệp migration đã áp dụng không được sửa (checksum). Mọi thay đổi lược đồ phải là phiên bản mới (V6+).
- Ảnh món lưu ngoài CSDL (`uploads/menu`), không nằm trong sao lưu CSDL.
- Dữ liệu mẫu và lược đồ cùng nằm trong một chuỗi phiên bản Flyway (xem mục 1): dễ nạp nhầm dữ liệu mẫu vào môi trường thật nếu quên đặt `FLYWAY_LOCATIONS`.
