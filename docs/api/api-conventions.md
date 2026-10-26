# Quy ước API

- Tiền tố `/api`, dữ liệu JSON UTF-8. Xác thực bằng cookie phiên `VTPHSESSION` (`withCredentials` ở client).
- **Lỗi** luôn có dạng `{ "code": "...", "message": "..." }` kèm các trường riêng nếu cần:

| Tình huống | HTTP | Ví dụ `code` |
|---|---|---|
| Chưa đăng nhập / hết phiên | 401 | `NO_SESSION` |
| Sai vai trò | 403 | `FORBIDDEN`, `OWNER_ONLY` |
| Không tìm thấy | 404 | `NO_TABLE`, `NO_ORDER`, `NO_LINE` |
| Sai trạng thái nghiệp vụ | 409 | `BAD_STATE`, `SHORTAGE`, `LINES_PENDING`, `NO_SHIFT` |
| Dữ liệu không hợp lệ | 400/422 | `INVALID_FORMAT`, `BAD_QTY`, `VALIDATION` (có `fields`) |
| Tài khoản khóa tạm | 423 | `LOCKED` (có `lockSeconds`) |
| Sai PIN/mật khẩu | 401 | `WRONG_SECRET` (có `attemptsLeft`) |
| Lỗi hệ thống | 500 | `INTERNAL` |

- Thông điệp `message` là tiếng Việt, hiển thị thẳng cho người dùng.
- Số tiền là số nguyên đồng. Thời gian là chuỗi ISO-8601.
- Swagger/OpenAPI: `/swagger-ui.html`, `/v3/api-docs`.

## Điểm vào hiện có

| Nhóm | Điểm vào | Vai trò |
|---|---|---|
| Phiên | `GET /api/auth/staff`, `POST /api/auth/staff/login`, `POST /api/auth/owner/login`, `GET /api/auth/me`, `POST /api/auth/logout` | công khai (me cần phiên) |
| Sơ đồ bàn | `GET /api/ops/tables`, `GET /api/ops/tables/{no}/order` | Phục vụ, Thu ngân |
| Gọi món | `POST /api/ops/tables/{no}/orders`, `POST /api/ops/orders/{id}/lines/{lid}/cancel`, `POST /api/ops/orders/{id}/move`, `POST /api/ops/orders/{id}/finish` | Phục vụ (hủy món: theo BR-025) |
| Thực đơn | `GET /api/ops/menu` | Phục vụ, Thu ngân, Pha chế |
| Pha chế | `GET /api/ops/kitchen`, `POST /api/ops/kitchen/{lid}/start`, `…/done` | Pha chế |
| Thu ngân | `GET/POST /api/ops/shift`, `/shift/open`, `/shift/close`, `GET /api/ops/pending`, `POST /api/ops/orders/{id}/pay`, `POST /api/ops/takeaway`, `GET /api/ops/drafts`, `POST /api/ops/drafts/{id}/confirm|cancel` | Thu ngân |
| Hệ thống | `GET /api/health` (công khai), `GET /api/menu` (đọc MySQL, 503 nếu chạy mock), `/actuator/health` | — |

Chủ quán/Quản lý được phép gọi mọi điểm vào (kế thừa quyền).
Hai bản cài đặt (bộ nhớ, MySQL) trả cùng khuôn JSON; điểm khác duy nhất người dùng thấy: `/api/ops/menu` ở bản MySQL có thêm `toppingIds` cho mỗi món và `toppings[].ingredient` luôn `null`.
Thêm API mới: kiểm tra vai trò ở backend, trả lỗi đúng khuôn trên, viết test MockMvc cho cả trường hợp 401 và 403.
