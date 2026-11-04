# Chiến lược kiểm thử

Số liệu cập nhật 2026-11-05: **88 test backend** (0 lỗi), **25 test giao diện** (0 lỗi) và **36 kịch bản quy tắc CSDL** (36/36 đạt).

## Backend (JUnit 5, `mvn -f backend/pom.xml test`)

| Tầng | Công cụ | Nội dung | Số test |
|---|---|---|---|
| Đơn vị | JUnit 5 | `AuthService` (kho bộ nhớ): khóa sau 5 lần sai (BR-042), định dạng PIN, đặt lại bộ đếm, ràng buộc chấm công mới được đăng nhập | 9 |
| Đơn vị | JUnit 5 | `NotificationBridge`: định tuyến kênh thông báo (đơn mang đi xong chỉ báo Thu ngân) | 6 |
| Đơn vị | JUnit 5 | `PricingPolicy`: khuyến mãi, trần điểm 30%, làm tròn 500đ, tích điểm; so với công thức cũ trên miền giá trị rộng | 9 |
| Sự kiện | Spring Test, không Mockito | Chỉ gửi thông báo sau commit, rollback không gửi, không có giao dịch thì gửi ngay | 3 |
| Truy cập và thời gian thực | Spring Boot Test, MockMvc, `@RecordApplicationEvents` | 401 khi chưa đăng nhập, 403 sai vai trò, đăng xuất, thứ tự sự kiện gửi đơn → bắt đầu pha → hoàn thành | 4 |
| Tích hợp MySQL: đăng nhập | Testcontainers (mysql:8.4), một container dùng chung | Flyway dựng 28 bảng, 15 trigger, dữ liệu mẫu; đăng nhập từ bảng `account` (bcrypt, khóa tạm lưu CSDL); tài khoản quầy dùng chung | 11 |
| Tích hợp MySQL: gọi món đến thanh toán | như trên, qua MockMvc | Bàn và thực đơn từ CSDL; gửi đơn ghi đủ order/batch/line/topping; gọi thêm; hủy theo vai trò; bánh trừ/hoàn kho; chuyển bàn; pha chế qua `sp_start_making`; thiếu nguyên liệu đánh dấu Hết hàng bền vững; chờ thanh toán → hóa đơn → bàn trống; mang đi tiền mặt, chuyển khoản, đơn nháp; chốt ca; JSON khớp mô hình; trigger vẫn chặn khi qua mặt service; giao khách đơn mang đi, doanh thu chuyển khoản trong ca, nhân viên phụ trách đang chấm công, chốt ca bị chặn khi còn đơn chưa giao | 19 |
| Tích hợp MySQL: tính tiền | như trên | Khuyến mãi, điểm, làm tròn, hoàn một phần theo tỷ lệ, tiền lưu trên hóa đơn | 5 |
| Tích hợp MySQL: quản trị | như trên | Thành viên, khuyến mãi, nhân viên và khóa tài khoản, chấm công và lịch sử chỉnh sửa, thực đơn/topping, kho (nhập, công thức, kiểm kê, tự bán lại), hao hụt, chốt ca/ngày, hủy hóa đơn và hoàn tiền, báo cáo | 13 |
| Tích hợp MySQL: chấm công mới được đăng nhập | như trên, bật `vtph.auth.require-attendance` | Chưa chấm công thì tài khoản cá nhân và quầy bị chặn; chấm công vai trò nào mở cửa vai trò đó; chấm công ra thì chặn lại; Chủ quán không bị ràng buộc | 3 |
| Đơn vị | JUnit 5 | `Db`: số tiền không âm/không thập phân/không quá trần, chuỗi không vượt độ dài cột, số nguyên quá dài | 4 |
| Tích hợp MySQL: ảnh | như trên | Tải ảnh món và topping, phân quyền, không trùng khi cùng mã | 2 |

Các test MySQL cần Docker đang chạy; không có Docker thì tự bỏ qua.

## Giao diện (Vitest, React Testing Library, `npm --prefix frontend run test`)

| Nội dung | Số test |
|---|---|
| Form đăng nhập: kiểm tra, sai PIN, bị khóa, chọn vai trò, chọn tên thu ngân và phục vụ (`LoginPage`) | 8 |
| Định dạng tiền và ngày (`format`) | 5 |
| Chặn truy cập theo vai trò (`RequireRole`) | 3 |
| Bảng dữ liệu (`DataTable`) | 2 |
| Bàn phím PIN (`PinPad`) | 1 |
| Màn thu ngân: sơ đồ bàn 14 bàn hai khu, bấm bàn Chờ thanh toán mở đúng bàn, chưa mở ca thì yêu cầu mở ca, mở ca thì Đơn mang đi mở khóa ngay (`PaymentsPage`) | 5 |
| Sơ đồ bàn: bàn dẫn tới màn gọi món, bàn Đang phục vụ có nút Khách đã dùng xong (`TablesPage`) | 1 |

Trước khi nộp còn chạy `npm run lint`, `npm run format:check` và `npm run typecheck`; CI chạy cùng bộ này cộng `npm run build` và kiểm tra tệp Flyway khớp `database/*.sql` (`scripts/sync-migrations.py --check`).

## Quy tắc dữ liệu (`database/run_tests.py`)

36 kịch bản trigger, ràng buộc CHECK và UNIQUE, mỗi kịch bản chạy trong giao dịch rồi hoàn tác. Đã chạy trên MySQL 8.4 nạp từ `database/*.sql`: **36/36 đạt**. Kịch bản đọc mật khẩu từ biến môi trường `MYSQL_PWD` và gọi `mysql` ở đường dẫn trong đầu tệp, nên cần chỉnh nếu MySQL cài ở chỗ khác hoặc chạy trong Docker. Chưa tích hợp CI.

## Kiểm tra thủ công và bán tự động

- Đã chạy bằng trình duyệt tự động (Playwright, không lưu trong kho) trên hệ thống thật cả bốn vai trò: đăng nhập, gọi món, gọi thêm, chuyển bàn, pha chế, thanh toán có điểm thành viên, đơn mang đi, mở hộp thoại ở mọi màn hình, chặn truy cập chéo vai trò. 21/21 bước đạt, không có lỗi console hay mạng ngoài các mã 401 và 404 dự kiến.
- Đã thử bằng yêu cầu HTTP song song: 8 yêu cầu cùng gửi vào một bàn chỉ tạo một đơn; 5 bàn cùng đặt một phần bánh cuối chỉ một bàn thành công, tồn không âm; 4 yêu cầu cùng thanh toán một đơn chỉ sinh một hóa đơn.
- Đã đối chiếu độc lập bằng SQL: tổng hóa đơn đúng công thức, điểm khách khớp lịch sử điểm, tiền mặt dự kiến của ca và doanh thu báo cáo khớp.

## Chưa có (nên làm tiếp)
- Đưa các kiểm tra tranh chấp (đồng thời) ở trên thành test tự động cho `JdbcOpsService`.
- Đưa kịch bản đầu-cuối (Playwright) vào kho để chạy lại được: gọi món → pha chế → thanh toán.
- Test STOMP thật qua WebSocket với MySQL, gồm từ chối đăng ký kênh sai vai trò.
- Test giao diện cho bảng pha chế, trang thanh toán và trang bàn.
- Tích hợp `database/run_tests.py` vào CI.
- Nhật ký thao tác (Audit Log) và cảnh báo đơn chờ pha chế quá 10 phút chưa làm, nên chưa có test.

## Chạy
```bash
mvn -f backend/pom.xml test
npm --prefix frontend run test
npm --prefix frontend run lint && npm --prefix frontend run typecheck
```
