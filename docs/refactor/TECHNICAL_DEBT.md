# Nợ kỹ thuật và rủi ro (khảo sát, chưa sửa gì)

Ngày 2026-10-26. Mỗi mục ghi rõ **[Đã xác minh]** (có bằng chứng trong mã/chạy thử) hoặc **[Giả thuyết]**. Mức ưu tiên: **P1** cao, **P2** trung bình, **P3** thấp.
Tiêu chí: giá trị cho khả năng bảo trì/kiểm thử và rủi ro lỗi nghiệp vụ; không đề xuất tách microservices.

## A. Cấu trúc và gắn kết

| # | Vấn đề | Bằng chứng | Ưu tiên |
|---|---|---|---|
| A1 | **`JdbcOpsService` là "god class" 955 dòng, 26 phương thức public**: gộp thực đơn cho nhân viên, sơ đồ bàn, tạo đơn, hủy món, chuyển bàn, bếp, ca thu ngân, thanh toán, đơn mang đi, đơn nháp, báo giá, toàn bộ SQL và tính tiền/điểm | `ops/JdbcOpsService.java` | **P1** [Đã xác minh] |
| A2 | **Chu trình gói**: `ops`↔`menu`, `ops`↔`promotion`; `common`→`ops`. Gốc: `OpsException` đặt trong gói `ops` | `DEPENDENCY_MAP.md` | **P1** [Đã xác minh] |
| A3 | **Hai cài đặt `OpsService`** (`JdbcOpsService`, `InMemoryOpsService` 418 dòng) trùng giao diện nhưng logic tách rời; chế độ không-CSDL chỉ có một phần chức năng và không được các module khác dùng | `ops/InMemoryOpsService.java`, các `@Profile` | **P2** [Đã xác minh] |
| A3b | **[ĐÃ XỬ LÝ 2026-10-26]** Giao diện web cũ "Đợt 1" (`resources/static`, 12 tệp HTML/CSS/JS) trùng chức năng với frontend React → đã xóa (khôi phục được từ commit `e35d3a4`). Không có test, tài liệu hay Dockerfile nào phụ thuộc vào nó | `src/main/resources/static` | **P3** [Đã xác minh] |
| A4 | Gói `table`, `kitchen`, `takeaway` chỉ có `package-info`, mã thật nằm trong `ops`: cấu trúc gói không phản ánh nơi đặt mã | 3 tệp `package-info.java` | **P3** [Đã xác minh] |
| A5 | **[ĐÃ XỬ LÝ 2026-10-26, xem `REFACTOR_LOG.md`]** ~~Tính tiền/điểm nằm rải rác và lặp~~ → gom vào `shared.pricing.PricingPolicy`. Mô tả ban đầu: tính tiền/điểm nằm rải rác và lặp: `round500` có hai cài đặt (`Db.round500`, `JdbcOpsService.round500`), quy tắc 30% điểm, 1 điểm = 1.000đ, 10.000đ = 1 điểm lặp ở `JdbcOpsService` và `InvoiceService` | `Db.java:132`, `JdbcOpsService.java:113,777,797-799`, `InvoiceService.java:223,233` | **P1** [Đã xác minh] (rủi ro lệch nghiệp vụ khi sửa một nơi) |
| A6 | `InvoiceService` và `JdbcOpsService` cùng ghi `order_line`, `refund_record`, `point_transaction`, `ingredient` bằng SQL riêng, không qua API nội bộ chung | xem `DEPENDENCY_MAP.md` §3 | **P2** [Đã xác minh] |

## B. Chất lượng mã

| # | Vấn đề | Bằng chứng | Ưu tiên |
|---|---|---|---|
| B1 | **Dữ liệu trả về là `Map<String,Object>` không định kiểu** ở hầu hết service quản trị (`JdbcOpsService` 36, `InventoryService` 25, `MenuAdminService` 23, `InvoiceService` 17...). Tên trường là "hợp đồng ngầm" với frontend; sai chính tả chỉ lộ ở thời gian chạy | thống kê `Map<String, Object>` | **P1** [Đã xác minh] |
| B2 | **Bốn nơi xử lý ngoại lệ**: `ApiExceptionAdvice`, `GlobalExceptionHandler`, `OpsController.onOps`, `AuthController.onAuth` | `common/`, `ops/`, `auth/` | **P2** [Đã xác minh] |
| B3 | Phân quyền theo vai trò viết tay trong controller (`who(s, Role...)`, 23 lần ở `OpsController`) và một phần trong service (`by.role != OWNER`); không có cơ chế khai báo (annotation/chính sách) | `OpsController`, `JdbcOpsService.cancelLine` | **P2** [Đã xác minh] |
| B4 | Chuỗi trạng thái/loại là chuỗi thô lặp lại (`'NEW'`, `'MAKING'`, `'WAITING_PAYMENT'`, `'CASH'`...) và có ánh xạ qua lại API↔DB (`WAITING_PAY`↔`WAITING_PAYMENT`, `TRANSFER`↔`TRANSFER_QR`, `LESS`↔`LOW`) rải trong mã | `JdbcOpsService` | **P2** [Đã xác minh] |
| B5 | Hai kiểu truy cập dữ liệu song song: `JdbcTemplate` trực tiếp (`JdbcOpsService`) và bọc `Db` (các service còn lại) | `common/Db.java` | **P3** [Đã xác minh] |
| B6 | Ghi log rất ít (4 câu lệnh log trong toàn bộ `src/main`); không có log kiểm toán cho thao tác nhạy cảm (hủy hóa đơn, hoàn tiền, khóa tài khoản) ngoài dữ liệu trong bảng | tìm kiếm `LoggerFactory` | **P2** [Đã xác minh] |
| B7 | Không có công cụ phân tích tĩnh/định dạng trong `pom.xml` | `pom.xml` | **P3** [Đã xác minh] |

## C. Cơ sở dữ liệu và hiệu năng

(Xem thêm `CURRENT_DATABASE.md` §5.)

| # | Vấn đề | Bằng chứng | Ưu tiên |
|---|---|---|---|
| C1 | `kitchen()` chạy 2 truy vấn phụ cho mỗi dòng món (N+1) | `JdbcOpsService.kitchen` | **P2** [Đã xác minh về mã; mức ảnh hưởng chưa đo] |
| C2 | `MenuAdminService.items()` kiểm tra tệp ảnh trên đĩa (tối đa 3 lần `Files.isRegularFile`) cho mỗi món ở mỗi lần gọi | `menu/MenuImageStore.version` | **P3** [Đã xác minh về mã; 30 món nên chưa đáng kể] |
| C3 | `v_available_stock` (SUM trên `order_line`) bị dùng trong `NOT EXISTS` cho từng kích thước/topping khi dựng thực đơn | `SIZE_SQL`, `TOPPING_SQL` | **P2** [Giả thuyết: chưa có `EXPLAIN`] |
| C4 | Pool kết nối và mức cô lập để mặc định; chưa có cấu hình/giám sát | `application-mysql.properties` | **P3** [Đã xác minh] |
| C5 | Ngữ nghĩa múi giờ `serverTimezone=Asia/Ho_Chi_Minh` so với ghi UTC chưa được ghi chép rõ | `application-mysql.properties`, `Db.nowUtc` | **P2** [Giả thuyết] |

**Đường cơ sở đo được (2026-10-26, dữ liệu mẫu nhỏ, 22 lần gọi/điểm cuối, đã tính cả thời gian khởi động `curl`)**:

| Điểm cuối | Trung vị | p95 |
|---|---|---|
| `GET /api/ops/menu` | 13,8 ms | 14,8 ms |
| `GET /api/ops/tables` | 10,5 ms | 10,8 ms |
| `GET /api/admin/items` | 11,5 ms | 13,1 ms |
| `GET /api/inventory/alerts` | 10,8 ms | 11,8 ms |
| `GET /api/invoices` | 10,9 ms | 12,6 ms |

Kết luận: **chưa có bằng chứng về nút thắt hiệu năng** ở quy mô dữ liệu mẫu; mọi mục C chỉ nên xử lý sau khi có dữ liệu/tải đại diện. (Không đo `kitchen` và báo cáo ở đợt này: một yêu cầu bị từ chối quyền vì dùng sai vai trò, một đường dẫn gõ sai — chỉ là lỗi của phép đo, không phải lỗi hệ thống.)

## D. Bảo mật và vận hành

| # | Vấn đề | Bằng chứng | Ưu tiên |
|---|---|---|---|
| D1 | **Swagger/OpenAPI công khai ở mọi profile** (`permitAll`), kể cả khi triển khai thật | `SecurityConfig` | **P1** [Đã xác minh] |
| D2 | Cờ `legacy-demo-hash` chấp nhận băm SHA-256 đơn giản (tiền tố cố định + tên đăng nhập, không dùng hàm băm mật khẩu chuyên dụng) cho dữ liệu mẫu; an toàn chỉ nếu tắt ở production (mặc định `false`) | `application.properties`, `AuthService` | **P2** [Đã xác minh] |
| D3 | CSRF tắt, dựa vào `SameSite=Lax` + CORS (ADR-004). Chấp nhận được với kiến trúc hiện tại nhưng cần giữ làm ràng buộc khi thay đổi cookie/CORS | `SecurityConfig` | **P3** [Đã xác minh] |
| D4 | Không có giới hạn tốc độ (rate limit) cho đăng nhập ngoài cơ chế khóa tài khoản 5 lần/15 phút theo tài khoản; chưa có giới hạn theo IP | `AuthService` | **P3** [Giả thuyết] |
| D5 | Ảnh món lưu ở thư mục cục bộ (`uploads/`), không có sao lưu/đồng bộ khi chạy nhiều bản | `MenuImageStore` | **P3** [Đã xác minh] |
| D6 | Mật khẩu CSDL mặc định rỗng khi quên đặt biến môi trường | `application-mysql.properties` | **P3** [Đã xác minh] |

## E. Kiểm thử

| # | Vấn đề | Ưu tiên |
|---|---|---|
| E1 | **[ĐÃ XỬ LÝ]** Đã thêm `PricingPolicyTest` (9) và `PricingRulesIntegrationTest` (5). Trước đó: không có kiểm thử đơn vị cho tính giá/điểm/làm tròn [Đã xác minh] | **P1** |
| E2 | Không có kiểm thử hợp đồng API (JSON field) cho các endpoint trả `Map`; frontend có thể vỡ mà test backend vẫn đạt [Đã xác minh] | **P1** (phải có trước khi định kiểu DTO ở B1) |
| E3 | Test tích hợp dùng một CSDL dùng chung giữa các lớp, cần khôi phục dữ liệu mẫu thủ công trong `@BeforeEach`; dễ rò rỉ trạng thái giữa test (đã gặp: băm bcrypt, trạng thái topping) | **P2** [Đã xác minh] |
| E4 | Thiếu kiểm thử tải/đồng thời cho các quy tắc "chỉ một..." (ca mở, đơn mở theo bàn) | **P3** [Giả thuyết] |

## F. Việc đã làm tốt (không nên phá khi refactor) [Đã xác minh]

- Quy tắc nghiệp vụ quan trọng có hai lớp bảo vệ (Java + ràng buộc/trigger CSDL).
- Khóa dòng `FOR UPDATE`, trừ kho bằng `UPDATE ... WHERE current_stock >= ?`, thông báo "lưu trước, báo sau" (`@TransactionalEventListener`).
- Bộ test tích hợp trên MySQL thật; ADR được ghi chép (`docs/architecture/architecture-decisions.md`).
- Không có phụ thuộc ngoài không cần thiết; lược đồ Flyway có phiên bản.
