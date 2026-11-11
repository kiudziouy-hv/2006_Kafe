# Cơ sở dữ liệu VTPH Coffee (MySQL 8.4)

Cơ sở dữ liệu của đồ án "Hệ thống quản lý quán cà phê VTPH Coffee" (Chương 5), suy ra từ ERD Chương 4.

## Các tập lệnh (chạy theo thứ tự)

| Tệp | Nội dung |
|---|---|
| `01_schema.sql` | 28 bảng, khóa chính/ngoại, khóa duy nhất, ràng buộc CHECK. **Xóa và tạo lại toàn bộ bảng** |
| `02_triggers.sql` | 15 trigger thực thi quy tắc nghiệp vụ (BR-004, 017, 025, 028, 030, 031, 035, 037, NFR-010, ASM-01, ISS-C4-10, UC-31) |
| `03_seed_master.sql` | Dữ liệu danh mục: nhân viên, tài khoản, 14 bàn, 30 món, topping, nguyên liệu, công thức, phiếu nhập, khuyến mãi, thành viên |
| `04_views_procedures.sql` | 5 view báo cáo/tra cứu và thủ tục `sp_start_making` |
| `05_seed_transactions.sql` | (Flyway V8, nạp cuối, chỉ khi `SPRING_FLYWAY_TARGET=latest`) Dữ liệu giao dịch mẫu của ngày hôm nay (đơn, hóa đơn, điểm). Chạy lại được sau `03` |
| `06_fix_expiry_view.sql` | Sửa `v_expiry_warning`: không cảnh báo phiếu nhập có số lượng cần kiểm tra bằng 0 (ASM-25) |
| `07_invoice_reprint_log.sql` | Bảng `invoice_reprint`: ghi người và giờ mỗi lần in lại hóa đơn (UC-23). Tổng cộng 29 bảng |
| `run_tests.py` | 36 kịch bản kiểm thử quy tắc nghiệp vụ, mỗi kịch bản chạy trong giao dịch rồi hoàn tác |
| `06_test_results.md` | Kết quả lần chạy kiểm thử gần nhất |

## Cách chạy và kiểm thử

Yêu cầu: MySQL 8.4 đang chạy, Python 3. Chạy các lệnh dưới đây trong thư mục `database/`. Trong ví dụ, `<mật khẩu root>` là mật khẩu `root` của MySQL, `<mật khẩu>` là mật khẩu bạn tự chọn cho tài khoản `vtph`.

### Bước 1. Tạo cơ sở dữ liệu và tài khoản (một lần)

```bash
mysql -u root -p -e "
CREATE DATABASE IF NOT EXISTS VTPH_Coffee CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'vtph'@'localhost' IDENTIFIED BY '<mật khẩu>';
GRANT ALL PRIVILEGES ON VTPH_Coffee.* TO 'vtph'@'localhost';
SET GLOBAL log_bin_trust_function_creators = 1;"
```

Dòng `SET GLOBAL` bắt buộc, nếu thiếu thì `02_triggers.sql` báo lỗi 1419 và nhiều test không đạt. Dòng này mất hiệu lực khi MySQL khởi động lại.

Trên macOS cài bằng gói chính thức, lệnh `mysql` nằm ở `/usr/local/mysql/bin/mysql`. Hãy gõ đường dẫn đầy đủ nếu terminal báo không tìm thấy lệnh.

### Bước 2. Nạp các tập lệnh (đúng thứ tự 01 đến 07)

```bash
export MYSQL_PWD='<mật khẩu>'
mysql -u vtph -e "DROP DATABASE IF EXISTS VTPH_Coffee; CREATE DATABASE VTPH_Coffee CHARACTER SET utf8mb4;"
for f in 0*.sql; do mysql -u vtph --default-character-set=utf8mb4 VTPH_Coffee < "$f"; done
```

Lệnh này xóa dữ liệu cũ rồi nạp lại từ đầu, cũng là cách cập nhật khi schema trong repo thay đổi.

### Bước 3. Chạy kiểm thử

```bash
MYSQL_PWD='<mật khẩu>' python3 run_tests.py
```

Kết quả đúng: dòng cuối là `Tổng: 36/36 đạt`. Mỗi kịch bản chạy trong một giao dịch rồi hoàn tác nên không làm thay đổi dữ liệu.

Các biến môi trường tùy chọn: `MYSQL_USER` (mặc định `vtph`), `MYSQL_HOST` (`localhost`), `MYSQL_TCP_PORT` (`3306`), `MYSQL_BIN` (đường dẫn tới `mysql` nếu không có trong `PATH`).

### Xử lý lỗi thường gặp

| Triệu chứng | Nguyên nhân và cách xử lý |
|---|---|
| Mọi test `KHÔNG ĐẠT`, báo `Access denied ... (using password: NO)` | Chưa đặt `MYSQL_PWD`. Chạy lại theo Bước 3 |
| Mọi test `KHÔNG ĐẠT`, báo `Access denied ... (using password: YES)` | Sai mật khẩu `vtph`. Đặt lại bằng `ALTER USER 'vtph'@'localhost' IDENTIFIED BY '<mật khẩu>';` (đăng nhập root) |
| Nhiều test `KHÔNG ĐẠT` với chữ `thực hiện thành công` | Trigger chưa được tạo. Làm lại Bước 1 (dòng `SET GLOBAL`) rồi Bước 2 |
| Báo `Unknown column 'handed_over_at'` | Cơ sở dữ liệu được nạp từ schema cũ. Làm lại Bước 2 |
| `mysql: command not found` | Dùng đường dẫn đầy đủ tới `mysql`, và đặt `MYSQL_BIN` khi chạy `run_tests.py` |

## Lưu ý

- Không lưu mật khẩu vào tệp hay đưa lên kho mã nguồn.
- `secret_hash` trong dữ liệu mẫu chỉ để minh họa; hệ thống thật băm bằng bcrypt/argon2 ở tầng ứng dụng.
- Đặt lại dữ liệu mẫu: chạy lại `03_seed_master.sql` rồi `05_seed_transactions.sql`.
