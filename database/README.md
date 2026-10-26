# Cơ sở dữ liệu VTPH Coffee

MySQL **8.4**, InnoDB, `utf8mb4`. Lược đồ suy ra từ ERD (Chương 4 của RAD): 27 bảng, ràng buộc bằng CHECK/UNIQUE/FK,
các quy tắc phức tạp hơn nằm trong trigger và thủ tục.

## Thứ tự chạy

| # | File | Nội dung |
|---|---|---|
| 0 | `00_create_database.sql` | Tạo database `VTPH_Coffee` |
| 1 | `01_schema.sql` | Bảng, khóa, ràng buộc (chạy lại được: có `DROP TABLE IF EXISTS`) |
| 2 | `02_triggers.sql` | Trigger: hóa đơn bất biến, chuyển trạng thái dòng món, chốt ca/ngày, chặn xóa dữ liệu giao dịch |
| 3 | `03_seed_master.sql` | Dữ liệu danh mục: nhân viên, tài khoản, 14 bàn, thực đơn, công thức, kho, khuyến mãi, thành viên |
| 4 | `04_views_procedures.sql` | View báo cáo/tra cứu và thủ tục `sp_start_making` |
| 5 | `05_seed_transactions.sql` | Dữ liệu giao dịch mẫu cho ngày hôm nay (chỉ dùng trên CSDL mẫu) |

```bash
mysql -u root -p < 00_create_database.sql
for f in 01_schema 02_triggers 03_seed_master 04_views_procedures 05_seed_transactions; do
  mysql -u root -p VTPH_Coffee < $f.sql
done
```

## Tài khoản ứng dụng (không dùng root cho backend)

```sql
CREATE USER 'vtph'@'localhost' IDENTIFIED BY '<mật-khẩu-mạnh>';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON VTPH_Coffee.* TO 'vtph'@'localhost';
-- Không cấp DROP/ALTER/TRUNCATE: dữ liệu giao dịch không bị xóa cứng (NFR-010).
```

## Lưu ý

- **Mật khẩu/PIN trong `03_seed_master.sql` chỉ để demo** (`SHA2(CONCAT('demo-', username, '-', mật_khẩu), 256)`).
  Backend dùng BCrypt; ở môi trường dev, backend chấp nhận hash demo này và tự nâng lên BCrypt khi đăng nhập
  thành công (xem `backend/README.md`). Môi trường thật phải tạo tài khoản bằng BCrypt.
- Tài khoản demo: `owner` / `admin123` (Chủ quán); `thungan1`, `thungan2`, `phucvu1..3`, `phache1..2` / `123456`.
- Các thông báo lỗi nghiệp vụ trong trigger/procedure có mã (`BR-xxx`, `ISS-xxx`, `NFR-xxx`) ở đầu câu; backend bắt
  `SQLSTATE 45000` và trả về cho giao diện.
- Sao lưu: RAD yêu cầu tự động 2 lần/ngày (14:30 và sau giờ đóng cửa), giữ tối thiểu 30 bản, khôi phục trong 4 giờ
  (NFR-013, NFR-014). Chưa làm trong bản này.
