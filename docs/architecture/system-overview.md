# Tổng quan kiến trúc

Mô hình **modular monolith**: một ứng dụng Spring Boot, chia module theo nghiệp vụ; giao diện React tách riêng.

```
Trình duyệt (React) ── REST /api ──▶ Spring Security ─▶ Controller ─▶ Service ─▶ (bộ nhớ | MySQL)
        ▲                                                                   │
        └────────── WebSocket /ws (STOMP, chỉ báo "có thay đổi") ◀── NotificationBridge ◀── sự kiện
```

## Module backend (`backend/src/main/java/vn/vtph/coffee`)

| Package | Vai trò | Trạng thái |
|---|---|---|
| `auth` | Đăng nhập Quản lý (mật khẩu) / Nhân viên (PIN 6 số), bcrypt, khóa 15 phút sau 5 lần sai, phiên cookie | Chạy thật; dữ liệu MySQL (profile `mysql`) hoặc bộ nhớ |
| `ops` | Gọi món, pha chế, ca thu ngân, thanh toán; phát `OpsEvent`. `OpsService` có hai bản: `InMemoryOpsService`, `JdbcOpsService` | Chạy thật; MySQL (profile `mysql`) hoặc bộ nhớ |
| `notification` | Chuyển `OpsEvent` thành tin STOMP theo kênh | Chạy thật |
| `config` | Spring Security, CORS, WebSocket (kiểm tra vai trò khi đăng ký kênh) | Chạy thật |
| `common` | Xử lý lỗi chung `{code, message}` | Chạy thật |
| `web` | `/api/health`, `/api/menu` (đọc MySQL) | Chạy thật, có chế độ mock |
| `staff` | Hồ sơ cá nhân, nhân viên/tài khoản, chấm công (kiosk PIN) và chỉnh sửa chấm công có lịch sử | Chạy thật (profile `mysql`) |
| `menu` | Món, kích thước/giá, topping, trạng thái Hết hàng/Ngừng bán (BR-006, BR-007) | Chạy thật (profile `mysql`) |
| `promotion` | Chương trình khuyến mãi, chọn mức giảm cao hơn khi trùng (BR-020), chốt vào dòng món khi gửi order | Chạy thật (profile `mysql`) |
| `inventory` | Nguyên liệu, công thức, nhập kho + tự bán lại, kiểm kê, hao hụt, cảnh báo tồn/hạn dùng | Chạy thật (profile `mysql`) |
| `customer` | Đăng ký/tra cứu thành viên, lịch sử điểm và giao dịch | Chạy thật (profile `mysql`) |
| `payment` | Danh sách/chi tiết hóa đơn, in lại, hủy hóa đơn, hủy dòng món đã thanh toán, xác nhận hoàn tiền (điểm hoàn/thu hồi theo BR-027, BR-032) | Chạy thật (profile `mysql`) |
| `shift` | Ngày kinh doanh và chốt ngày (BR-037, BR-038); mở/chốt ca nằm ở `ops` | Chạy thật (profile `mysql`) |
| `report` | Báo cáo doanh thu theo khoảng ngày, món bán chạy (BR-040, BR-041) | Chạy thật (profile `mysql`) |

Thứ tự tính tiền (BR-021) nằm ở `JdbcOpsService.settle`: giá món + topping → khuyến mãi đã chốt trên từng dòng → điểm dùng (tối đa 30%) → làm tròn 500đ → tích điểm trên số tiền thực trả. Các module quản trị dùng chung `common.Db` (JDBC, giờ UTC → ISO), `common.Access` (kiểm tra vai trò) và `common.ApiExceptionAdvice` (đổi lỗi trigger của CSDL thành 409 kèm thông điệp quy tắc).

## Vai trò và thiết bị

| Vai trò (`Role`) | Thiết bị | Trang chủ giao diện | Kênh thời gian thực được xem |
|---|---|---|---|
| `OWNER` (Chủ quán/Quản lý, kế thừa mọi quyền) | Máy tính | `/admin` | tất cả |
| `WAITER` | Điện thoại / máy tính bảng | `/service` | `/topic/service` |
| `CASHIER` | Máy thu ngân dùng chung | `/cashier` | `/topic/cashier` |
| `BARISTA` | Màn hình pha chế dùng chung | `/kitchen` | `/topic/kitchen` |

Trong RAD, Chủ quán và Quản lý dùng chung một vai trò (`OWNER_MANAGER` ở bảng `account`, `OWNER` trong mã Java). Quyền thật nằm ở backend (`OpsController.who`); ẩn nút ở giao diện chỉ để thân thiện.

## Giao diện (`frontend/src`)

`app/` (router, providers) · `features/<tên>/` (auth, tables, kitchen, payments) · `layouts/` (Admin, Service, Cashier, Kitchen) · `components/` (ui, layout, feedback, shared) · `lib/` (http, websocket, logger) · `hooks/` · `types/` · `utils/`. Màu và font theo Figma "Mocha v5" (`styles/index.css`).
