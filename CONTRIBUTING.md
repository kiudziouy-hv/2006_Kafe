# Đóng góp

Xem quy trình đầy đủ ở [docs/development/team-workflow.md](docs/development/team-workflow.md). Tóm tắt:

1. Tạo nhánh từ `main`: `feature/<UC>-<mô-tả-ngắn>` hoặc `fix/<mô-tả>`.
2. Nghiệp vụ phải khớp use case và business rule trong RAD (ghi mã `UC-xx`, `BR-xxx` trong mô tả PR).
3. Trước khi mở PR: `make test lint` (hoặc các lệnh tương đương trong README) phải xanh.
4. Không commit mật khẩu, PIN thật, tệp `.env`. Dữ liệu mẫu chỉ ở `database/` và `mock-accounts.json`.
5. Sửa lược đồ: sửa `database/*.sql` rồi chạy `python3 scripts/sync-migrations.py` và commit cả tệp Flyway sinh ra.
