# VTPH Coffee — Backend

Java 21 + Spring Boot 3.5 (Maven) + MySQL 8.4. Chạy trong mạng nội bộ của quán, không phụ thuộc dịch vụ bên ngoài
(ràng buộc 2 và 8 trong RAD: hệ thống cài bằng Java, chạy mạng nội bộ).

Truy cập dữ liệu dùng `JdbcTemplate` (không dùng JPA) vì CSDL của nhóm đã đặt nhiều quy tắc trong trigger/procedure,
ENUM và cột sinh tự động; viết SQL trực tiếp cho dễ kiểm soát.

## Chạy thử

1. Tạo CSDL theo [`../database/README.md`](../database/README.md) (chạy `00`–`05`) và tạo tài khoản MySQL `vtph`.
2. Đặt biến môi trường rồi chạy:

```bash
export DB_URL='jdbc:mysql://localhost:3306/VTPH_Coffee?useUnicode=true&characterEncoding=utf8&connectionTimeZone=Asia/Ho_Chi_Minh'
export DB_USER=vtph
export DB_PASSWORD='<mật-khẩu>'
export JWT_SECRET='<chuỗi-bí-mật-tối-thiểu-32-ký-tự>'     # bắt buộc, không có mặc định
export SPRING_PROFILES_ACTIVE=dev                          # chỉ dev: chấp nhận hash demo của file seed

cd backend
mvn spring-boot:run
```

Kiểm tra: `GET http://localhost:8080/api/health` → `{"status":"ok"}`. Chạy test: `mvn test` (không cần MySQL).

## Biến cấu hình

| Biến | Ý nghĩa | Mặc định |
|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Kết nối MySQL | `localhost:3306/VTPH_Coffee`, `vtph`, rỗng |
| `JWT_SECRET` | Khóa ký token, tối thiểu 32 ký tự | **không có**, thiếu thì backend không khởi động |
| `PORT` | Cổng HTTP | `8080` |
| `vtph.jwt.ttl-minutes` | Thời hạn token | 600 |
| `vtph.auth.max-failed-attempts` / `lock-minutes` | BR-042: sai 5 lần thì khóa 15 phút (tối đa 5 do `ck_account_attempts`) | 5 / 15 |
| `vtph.auth.accept-legacy-demo-hash` | Chỉ dev: chấp nhận `SHA2(...)` trong `03_seed_master.sql`, tự nâng lên BCrypt khi đăng nhập đúng | `false` (`true` ở profile `dev`) |
| `vtph.cors.allowed-origins` | Origin của frontend khi dev | `http://localhost:5173` |

## API hiện có

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/health` | công khai | Kiểm tra backend sống |
| GET | `/api/auth/staff` | công khai | Danh sách tài khoản nhân viên (không gồm Chủ quán) cho màn chọn tài khoản trên thiết bị dùng chung |
| POST | `/api/auth/login` | công khai | Body `{"username","secret"}` → `{token, expiresAt, account}` |
| GET | `/api/auth/me` | đã đăng nhập | Thông tin người dùng hiện tại |
| GET | `/api/tables` | Phục vụ, Thu ngân, Chủ quán | Sơ đồ 14 bàn |

Gửi token ở các API còn lại: `Authorization: Bearer <token>`. Mọi đường dẫn `/api/owner/**` chỉ dành cho Chủ quán/Quản lý.

### Đăng nhập và khóa tài khoản (M01, BR-042)

- Sai mã PIN/mật khẩu: trả 401, còn bao nhiêu lần thử. Lần sai thứ 5: tài khoản chuyển `TEMP_LOCKED` trong 15 phút, trả **423**.
- Hết 15 phút tự mở; sai tiếp thì đếm lại từ 1. Tài khoản `LOCKED` (do Chủ quán khóa) trả 423, không tự mở.
- Mật khẩu/PIN băm BCrypt (NFR-012). Bộ đếm được ghi trong cùng giao dịch có `SELECT ... FOR UPDATE`, và giao dịch **không rollback**
  khi trả lỗi đăng nhập, nếu không bộ đếm sẽ không bao giờ tăng.

### Định dạng lỗi

Mọi lỗi có dạng `{"code": "...", "message": "..."}` với thông báo tiếng Việt.

| HTTP | `code` | Khi nào |
|---|---|---|
| 401 | `UNAUTHENTICATED`, `BAD_CREDENTIALS` | Thiếu/sai token, sai PIN |
| 403 | `FORBIDDEN` | Sai vai trò |
| 409 | `BUSINESS_RULE` | Trigger/procedure của CSDL báo `SQLSTATE 45000`; `message` là câu do nhóm viết, mở đầu bằng mã quy tắc (ví dụ `BR-028: ...`) |
| 409 | `DUPLICATE`, `REFERENCE` | Trùng khóa duy nhất / vi phạm khóa ngoại |
| 422 | `CONSTRAINT` | Vi phạm CHECK |
| 423 | `ACCOUNT_TEMP_LOCKED`, `ACCOUNT_LOCKED` | Tài khoản bị khóa |

## Cấu trúc

```
src/main/java/vn/vtph/coffee/
  auth/     Đăng nhập, JWT, bộ lọc xác thực, repository tài khoản
  table/    Sơ đồ bàn
  common/   Lỗi thống nhất, xử lý SQLSTATE 45000, health
  config/   Bảo mật theo vai trò, CORS, thuộc tính cấu hình
```

## Việc tiếp theo (theo module trong RAD)

- M02 thực đơn, M06 công thức/kho (CRUD, trạng thái Hết hàng tự động theo tồn khả dụng).
- M03/M04 đơn tại quán và mang đi; M05 quầy pha chế (gọi `sp_start_making`).
- Đẩy đơn sang màn hình pha chế trong dưới 2 giây (NFR-001): WebSocket hoặc SSE.
- M07 thanh toán, hóa đơn (làm tròn 500 đồng, BR-021), điểm thành viên M08, khuyến mãi M09, chốt ca/ngày M10, báo cáo M11.
- Sao lưu tự động 2 lần/ngày (NFR-013), in hóa đơn 80 mm (NFR-016).
