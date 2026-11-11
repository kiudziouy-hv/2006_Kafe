# Quy ước mã nguồn

## Chung
- Tên biến, hàm, lớp bằng tiếng Anh; chú thích và thông điệp cho người dùng bằng tiếng Việt có dấu.
- Mỗi quy tắc nghiệp vụ ghi mã `UC-xx` / `BR-xxx` ở chú thích gần mã thực thi.
- Không ghi PIN, mật khẩu, mã phiên vào log.

## Backend (Java 21, Spring Boot)
- Gói theo nghiệp vụ (`auth`, `ops`, `notification`…), không theo tầng kỹ thuật toàn cục.
- Quyền kiểm tra ở backend (`OpsController.who`); Spring Security chỉ bắt buộc đã đăng nhập.
- Lỗi nghiệp vụ ném `OpsException`/`AuthException` với `code` ổn định; không trả stack trace.
- Phát sự kiện (`OpsEvent`) **sau** khi dữ liệu đã đổi.
- Mỗi API mới có test MockMvc cho 401, 403 và trường hợp thành công.

## Frontend (React + TypeScript strict)
- Mỗi tính năng ở `features/<tên>/{api,components,hooks,pages,schemas}`, chỉ tạo thư mục khi thực sự có tệp.
- Dữ liệu từ máy chủ dùng TanStack Query (khóa bắt đầu bằng `['ops', …]` để thông báo làm mới được); không lưu dữ liệu máy chủ vào state cục bộ.
- Biểu mẫu dùng React Hook Form + Zod; kiểm tra ở giao diện chỉ là gợi ý, backend kiểm tra lại.
- Màu lấy từ biến trong `styles/index.css` (Mocha v5), font Fraunces; không thêm màu cứng.
- Truy cập: nút có tên đọc được, vùng thông báo `aria-live`, vòng focus hiển thị.
- `npm run lint`, `npm run format:check`, `npm run typecheck` phải sạch.
