# Cơ sở dữ liệu VTPH Coffee

MySQL **8.4**, InnoDB, `utf8mb4`. Lược đồ suy ra từ ERD (Chương 4 của RAD): 28 bảng, ràng buộc bằng CHECK/UNIQUE/FK,
các quy tắc phức tạp hơn nằm trong trigger và thủ tục.

## Nạp CSDL

```bash
./load.sh -uroot -p                              # đầy đủ, gồm dữ liệu giao dịch mẫu
SKIP_SAMPLE_TRANSACTIONS=1 ./load.sh -uroot -p   # chỉ danh mục, không có đơn/hóa đơn giả
```

Tham số được chuyển cho `mysql` (`-h`, `-P`, `-u`, `-p`…). **`01_schema.sql` xóa và tạo lại mọi bảng**, nên không chạy
trên CSDL đang có dữ liệu thật.

| # | File | Nội dung |
|---|---|---|
| 0 | `00_create_database.sql` | Tạo database `VTPH_Coffee` |
| 1 | `01_schema.sql` | Bảng, khóa, ràng buộc (chạy lại được: có `DROP TABLE IF EXISTS`) |
| 2 | `02_triggers.sql` | Trigger: hóa đơn bất biến, chuyển trạng thái dòng món, chốt ca/ngày, chặn xóa dữ liệu giao dịch |
| 3 | `03_seed_master.sql` | Danh mục: nhân viên, tài khoản, 14 bàn, thực đơn, công thức, kho, khuyến mãi, thành viên |
| 4 | `04_views_procedures.sql` | View báo cáo/tra cứu và thủ tục `sp_start_making` |
| 5 | `05_seed_transactions.sql` | Giao dịch mẫu cho ngày hôm nay (chỉ dùng trên CSDL mẫu; bỏ khi chạy thật) |
| 6 | `06_backend_additions.sql` | **Bổ sung của backend** (xem dưới); chạy lại được |

`01`–`05` là file của nhóm, **không bị backend chỉnh sửa**. Chỉ thêm `00`, `06`, `load.sh` và `tests/`.

### Bổ sung ở `06_backend_additions.sql`

Bảng `takeaway_order` thêm 3 cột: `quoted_total` (số tiền đã báo khách), `customer_id`, `points_to_use`. Lý do: đơn nháp
chuyển khoản/QR (FR-M04-003) phải nhớ số tiền đã báo để khi xác nhận so khớp lại (ASM-03), nhưng lược đồ gốc chưa có
chỗ lưu. Nếu nhóm muốn gộp vào `01_schema.sql` thì chuyển các cột này sang đó rồi bỏ file `06`.

## Kiểm tra quy tắc nghiệp vụ trong CSDL

```bash
./load.sh -uroot -p
MYSQL_ARGS="-uroot -p" ./tests/run_rules.sh
```

24 ca kiểm tra (BR-004, 010, 011, 017, 021, 024, 025, 028, 029, 030, 035, 037, ISS-C4-10, ASM-01, NFR-010…) chạy trong
giao dịch rồi rollback, không để lại dữ liệu. Đã chạy: **24/24 đạt** trên MySQL 8.0 (nhóm dùng 8.4; chưa thử trên 8.4).

## Tài khoản ứng dụng (không dùng root cho backend)

```sql
CREATE USER 'vtph'@'localhost' IDENTIFIED BY '<mật-khẩu-mạnh>';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON VTPH_Coffee.* TO 'vtph'@'localhost';
-- Không cấp DROP/ALTER/TRUNCATE: dữ liệu giao dịch không bị xóa cứng (NFR-010).
```

## Múi giờ

Các cột `DATETIME` không lưu múi giờ. Đặt MySQL chạy giờ quán để `CURDATE()`/`NOW()` trong view và seed khớp backend:

```ini
# /etc/mysql/conf.d/vtph.cnf
[mysqld]
default-time-zone = '+07:00'
```

Backend luôn truyền thời điểm tường minh theo giờ `Asia/Ho_Chi_Minh` khi ghi dữ liệu, không dựa vào giá trị mặc định
của MySQL; cấu hình trên chỉ để các view/seed của nhóm (dùng `CURDATE()`) cho kết quả đúng ngày.

## Lưu ý

- **Mật khẩu/PIN trong `03_seed_master.sql` chỉ để demo** (`SHA2(CONCAT('demo-', username, '-', mật_khẩu), 256)`).
  Backend dùng BCrypt; ở profile `dev`, backend chấp nhận hash demo này và tự nâng lên BCrypt khi đăng nhập thành công
  (xem `backend/README.md`). Môi trường thật phải tạo tài khoản bằng backend (BCrypt), không dùng seed.
- Tài khoản demo: `owner` / `admin123` (Chủ quán); `thungan1`, `thungan2`, `phucvu1..3`, `phache1..2` / `123456`.
- Các thông báo lỗi nghiệp vụ trong trigger/procedure có mã (`BR-xxx`, `ISS-xxx`, `NFR-xxx`) ở đầu câu; backend bắt
  `SQLSTATE 45000` và trả về cho giao diện.
- Sao lưu tự động 2 lần/ngày và khôi phục: xem [`../scripts/README.md`](../scripts/README.md).
