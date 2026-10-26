# Quy trình làm việc nhóm

1. **Nhánh:** từ `main` tạo `feature/uc-22-thanh-toan` hoặc `fix/pin-khoa-15-phut`. Không đẩy thẳng lên `main`.
2. **Commit:** tiếng Việt hoặc Anh, nói rõ thay đổi; nhắc `UC-xx`/`BR-xxx` nếu liên quan.
3. **Pull request:** mô tả nghiệp vụ thay đổi, ảnh chụp nếu có giao diện, danh sách test. Cần ít nhất một người khác duyệt.
4. **CI** (`.github/workflows/ci.yml`) chạy: kiểm tra Flyway khớp `database/`, `mvn -f backend/pom.xml verify`, lint + định dạng + typecheck + test + build giao diện. PR chỉ gộp khi xanh.
5. **Đổi lược đồ CSDL:** sửa `database/*.sql` → `python3 scripts/sync-migrations.py` → commit cả hai. Báo nhóm tài liệu cập nhật Chương 5.
6. **Đổi nghiệp vụ:** sửa RAD/sơ đồ trước, rồi mới sửa mã (thứ tự nhóm đã chốt: tài liệu → thiết kế → cài đặt).
7. **Bí mật:** mật khẩu/PIN thật chỉ ở biến môi trường hoặc `.env` (đã ignore).

## Chia việc gợi ý theo đợt
| Đợt | Nội dung | UC |
|---|---|---|
| 1 (xong) | Đăng nhập, phân quyền, khung giao diện tĩnh | UC-01, UC-02 |
| 2 | Gọi món, pha chế, thanh toán (đang ở bộ nhớ) + khung React này | UC-07..UC-15, UC-22, UC-30 |
| 3 | Chuyển nghiệp vụ sang MySQL (ADR-006) | tất cả ở đợt 2 |
| 4 | Thực đơn, kho, nhân sự, báo cáo, hóa đơn | UC-04..UC-06, UC-16..UC-21, UC-23..UC-29, UC-31..UC-34 |
