# Cơ sở dữ liệu

Nguồn chuẩn là thư mục [`database/`](../../database/README.md) (Chương 5 của báo cáo): `01_schema.sql` (28 bảng, mỗi bảng có `COMMENT` mô tả và mã yêu cầu FR/BR liên quan), `02_triggers.sql`, `04_views_procedures.sql`, dữ liệu mẫu `03`/`05`, và `run_tests.py` (35 kịch bản quy tắc nghiệp vụ). Từ điển dữ liệu chính là các `COMMENT` trong `01_schema.sql`; không chép lại ở đây để khỏi lệch.

ERD Chen: mục 4.6 của RAD (`Final/N15_RAD_v6.docx`).

## Đưa vào ứng dụng bằng Flyway

```bash
python3 scripts/sync-migrations.py   # sinh backend/src/main/resources/db/{migration,seed}
SPRING_PROFILES_ACTIVE=mysql DB_PASSWORD=... mvn -f backend/pom.xml spring-boot:run
```

| Tệp Flyway | Từ | Ghi chú |
|---|---|---|
| `db/migration/V1__schema.sql` | `01_schema.sql` | bỏ `ALTER DATABASE`, `USE`, `DROP TABLE` |
| `db/migration/V2__triggers.sql` | `02_triggers.sql` | dùng `DELIMITER` (Flyway hỗ trợ cho MySQL) |
| `db/seed/V3__seed_master.sql` | `03_seed_master.sql` | chỉ môi trường phát triển |
| `db/migration/V4__views_procedures.sql` | `04_views_procedures.sql` | |
| `db/seed/V5__seed_transactions.sql` | `05_seed_transactions.sql` | chỉ môi trường phát triển |

Triển khai thật: đặt `FLYWAY_LOCATIONS=classpath:db/migration` để không nạp dữ liệu mẫu.
MySQL bật binary log cần `log_bin_trust_function_creators=1` mới tạo được trigger (compose đã đặt).

## Cần biết

- `account.secret_hash` trong dữ liệu mẫu chỉ để minh họa; ứng dụng thật phải băm bcrypt/argon2 trước khi lưu.
- Không xóa cứng dữ liệu giao dịch (NFR-010): khóa ngoại `RESTRICT`, trigger chặn `DELETE`. Muốn xóa dữ liệu mẫu, `V3`/`V5` dùng `TRUNCATE` (chỉ chạy trên CSDL mẫu).
- **Đã kiểm chứng:** `MySqlAuthIntegrationTest` (Testcontainers, MySQL 8.4) áp 5 migration lên CSDL trống, thấy đủ 28 bảng, 15 trigger, 8 tài khoản mẫu và collation `utf8mb4_0900_as_ci`. Chưa chạy `run_tests.py` (35 kịch bản) trên CSDL do Flyway dựng.
- Script đồng bộ giữ `ALTER DATABASE … COLLATE utf8mb4_0900_as_ci` (đổi sang CSDL hiện tại) để so sánh chuỗi phân biệt dấu như bản gốc.
