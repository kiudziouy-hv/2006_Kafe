# Cơ sở dữ liệu VTPH Coffee (MySQL 8.4)

Cơ sở dữ liệu của đồ án "Hệ thống quản lý quán cà phê VTPH Coffee" (Chương 5), suy ra từ ERD Chương 4.

## Các tập lệnh (chạy theo thứ tự)

| Tệp | Nội dung |
|---|---|
| `01_schema.sql` | 28 bảng, khóa chính/ngoại, khóa duy nhất, ràng buộc CHECK. **Xóa và tạo lại toàn bộ bảng** |
| `02_triggers.sql` | 15 trigger thực thi quy tắc nghiệp vụ (BR-004, 017, 025, 028, 030, 031, 035, 037, NFR-010, ASM-01, ISS-C4-10) |
| `03_seed_master.sql` | Dữ liệu danh mục: nhân viên, tài khoản, 14 bàn, 30 món, topping, nguyên liệu, công thức, phiếu nhập, khuyến mãi, thành viên |
| `04_views_procedures.sql` | 5 view báo cáo/tra cứu và thủ tục `sp_start_making` |
| `05_seed_transactions.sql` | Dữ liệu giao dịch mẫu của ngày hôm nay (đơn, hóa đơn, điểm). Chạy lại được sau `03` |
| `run_tests.py` | 35 kịch bản kiểm thử quy tắc nghiệp vụ, mỗi kịch bản chạy trong giao dịch rồi hoàn tác |
| `06_test_results.md` | Kết quả lần chạy kiểm thử gần nhất |

## Cách chạy

Tạo cơ sở dữ liệu và tài khoản (đăng nhập bằng `root`, thay mật khẩu bằng mật khẩu của bạn):

```sql
CREATE DATABASE IF NOT EXISTS VTPH_Coffee CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'vtph'@'localhost' IDENTIFIED BY '<mật khẩu>';
GRANT ALL PRIVILEGES ON VTPH_Coffee.* TO 'vtph'@'localhost';
-- chỉ cần một lần để tạo được trigger khi MySQL bật binary log:
SET GLOBAL log_bin_trust_function_creators = 1;
```

Nạp các tập lệnh:

```bash
for f in 01_schema.sql 02_triggers.sql 03_seed_master.sql 04_views_procedures.sql 05_seed_transactions.sql; do
  /usr/local/mysql/bin/mysql -u vtph -p --default-character-set=utf8mb4 VTPH_Coffee < $f
done
```

Chạy kiểm thử (mật khẩu đọc từ biến môi trường, không lưu trong tệp):

```bash
MYSQL_PWD='<mật khẩu>' python3 run_tests.py
```

## Lưu ý

- Không lưu mật khẩu vào tệp hay đưa lên kho mã nguồn.
- `secret_hash` trong dữ liệu mẫu chỉ để minh họa; hệ thống thật băm bằng bcrypt/argon2 ở tầng ứng dụng.
- Đặt lại dữ liệu mẫu: chạy lại `03_seed_master.sql` rồi `05_seed_transactions.sql`.
