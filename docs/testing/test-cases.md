# Bộ test case toàn hệ thống

Tài liệu này liệt kê test case chức năng cho **2006 Kafé (VTPH Coffee)** theo từng nhóm use case (UC-01 → UC-34 trong RAD). Chiến lược, số liệu test tự động và cách chạy nằm ở [test-strategy.md](test-strategy.md).

## Cách dùng

- **Môi trường:** chạy `scripts/dev-mysql.sh`, mở http://localhost:5173. Mỗi lần chạy, dữ liệu dựng lại từ đầu (đơn, hóa đơn, ca, chấm công rỗng). Xem README mục 3 và 4.
- **Cột Loại:** `TC` = thủ công trên giao diện; `API` = kiểm bằng gọi API (Swagger hoặc curl); `DB` = kiểm trigger/ràng buộc CSDL; `Auto` = đã có test tự động bao phủ (ghi tên lớp test), vẫn nên thử tay khi demo.
- **Ưu tiên:** `P1` = bắt buộc đạt trước khi nộp/demo; `P2` = quan trọng; `P3` = bổ sung.
- Mỗi case ghi **kết quả mong đợi** để đối chiếu; "Đạt/Không đạt" ghi ở cột cuối khi chạy thật.

## Dữ liệu mẫu dùng trong test

| Mục | Giá trị |
|---|---|
| Chủ quán | `owner` / `admin123` |
| PIN | Phục vụ `123456`, Pha chế `345678`; thu ngân có PIN riêng: Hồ Quốc Tiến `234567`, Lê Hoàng Cường `456789` |
| Thu ngân (cá nhân) | Hồ Quốc Tiến (tài khoản 2) |
| Phục vụ (cá nhân) | Võ Tấn Phát (4), Võ Thị Em (5) |
| Pha chế (cá nhân) | Trần Thanh Huy (7) |
| Tài khoản quầy dùng chung | Thu ngân (9), Pha chế (10), Phục vụ (11) |
| Bàn / thực đơn | 14 bàn, 30 món, 5 topping |
| Giá mẫu | Trà đào cam sả M 45.000đ · Tiramisu 45.000đ · Cà phê sữa L 39.000đ · Trà vải M 42.000đ · Trân châu đen +8.000đ |
| Thành viên mẫu | Nguyễn Thị Hoa, `0912345678`, 24 điểm |
| Khuyến mãi nền | Tea Happy Hour 14:00–16:00 giảm 15% nhóm Trà; Cake Evening 20:00–21:30 giảm 10% nhóm Bánh |

> Các số tiền trong test ghi cho **ngoài hai khung giờ khuyến mãi** trên. Trong khung giờ đó, số tiền của món liên quan sẽ khác.

---

## 1. Đăng nhập, phiên, phân quyền (UC-01, UC-02, BR-042)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| AUTH-01 | Chủ quán đăng nhập đúng | Tab **Quản lý** → `owner` / `admin123` → Đăng nhập | Vào `/admin` (Báo cáo); không cần chấm công | TC, Auto (MySqlAttendanceLoginIntegrationTest) | P1 | |
| AUTH-02 | Chủ quán bỏ trống ô | Bấm Đăng nhập khi để trống | Báo "Nhập tên đăng nhập." / yêu cầu mật khẩu; không gọi API | TC, Auto (LoginPage.test) | P1 | |
| AUTH-03 | Sai mật khẩu Chủ quán | Nhập `owner` + mật khẩu sai | Thông báo sai thông tin, kèm số lần còn lại | TC | P1 | |
| AUTH-04 | Khóa tạm sau 5 lần sai (BR-042) | Nhập sai PIN/mật khẩu 5 lần liên tiếp | Lần thứ 5 báo khóa, nêu thời gian chờ (~15 phút); đăng nhập đúng trong thời gian khóa vẫn bị từ chối | TC, Auto (AuthServiceTest, MySqlAuthIntegrationTest) | P1 | |
| AUTH-05 | Đăng nhập đúng làm lại bộ đếm sai | Sai 3 lần, đăng nhập đúng, sau đó sai 1 lần | Báo còn 4 lần thử, không phải còn 1 | Auto (AuthServiceTest) | P2 | |
| AUTH-06 | PIN sai định dạng | Tab Nhân viên → chọn vai trò → nhập 1 chữ số → OK | "Mã PIN gồm đúng 6 chữ số."; không gọi API | TC, Auto (LoginPage.test) | P1 | |
| AUTH-07 | Chưa chọn vai trò | Tab Nhân viên → nhập 6 số → OK khi chưa chọn vai trò | "Chọn vai trò trước khi nhập PIN." | TC | P2 | |
| AUTH-08 | Bàn phím PIN chỉ nhận số, tối đa 6 | Bấm số nhiều lần; dùng nút xóa | Không quá 6 ký tự; xóa được từng số | TC, Auto (PinPad.test) | P3 | |
| AUTH-09 | Nhân viên chưa chấm công | Chưa ai chấm công → chọn Thu ngân, PIN đúng | 403 `NOT_CHECKED_IN`, "Chưa có nhân viên nào chấm công vào ca…" | TC, Auto (MySqlAttendanceLoginIntegrationTest) | P1 | |
| AUTH-10 | Chấm công vai trò nào mở cửa vai trò đó | Thu ngân chấm công; thử đăng nhập Phục vụ | Thu ngân vào được; Phục vụ vẫn bị `NOT_CHECKED_IN` | Auto (MySqlAttendanceLoginIntegrationTest) | P1 | |
| AUTH-11 | Chấm công ra thì chặn lại | Thu ngân chấm công ra; đăng nhập lại | Bị từ chối `NOT_CHECKED_IN`; phiên đang mở không bị ngắt | Auto, TC | P2 | |
| AUTH-12 | Thu ngân chọn tên khi đăng nhập | Có thu ngân đang chấm công → chọn Thu ngân | Hiện ô **Thu ngân** liệt kê đúng người đang chấm công | TC, Auto (LoginPage.test) | P1 | |
| AUTH-13 | Thiếu tên thu ngân | Chọn Thu ngân, nhập PIN, không chọn tên → OK | "Chọn tên của bạn trước khi nhập PIN."; không gọi API | TC, Auto (LoginPage.test) | P1 | |
| AUTH-14 | Phục vụ chọn tên khi đăng nhập | Có phục vụ đang chấm công → chọn Phục vụ | Hiện ô **Nhân viên phục vụ**; chọn tên + PIN → vào `/service` | TC, Auto (LoginPage.test) | P1 | |
| AUTH-15 | API từ chối đăng nhập quầy thiếu/sai tên | `POST /api/auth/staff/login` tài khoản quầy 9 không `staffId`, hoặc `staffId` của người chưa chấm công | 400 `STAFF_REQUIRED` | API, Auto (MySqlAttendanceLoginIntegrationTest) | P1 | |
| AUTH-16b | Thu ngân dùng PIN riêng | Lê Hoàng Cường (PIN `456789`) chấm công; đăng nhập quầy, chọn Lê Hoàng Cường rồi nhập `234567` (PIN của Hồ Quốc Tiến/quầy) | Từ chối "Mã PIN không đúng."; nhập PIN riêng thì vào được; PIN của người này không mở được tên người kia; sai 5 lần chỉ khóa người đó | TC, Auto (MySqlAttendanceLoginIntegrationTest) | P1 | |
| AUTH-16 | Tên người chọn hiện sau đăng nhập | Đăng nhập thu ngân chọn "Hồ Quốc Tiến" | Menu tài khoản hiện tên người chọn; `GET /api/auth/me` có `staffName` | TC, API | P2 | |
| AUTH-17 | Màn đăng nhập không lộ danh sách tài khoản | Chọn vai trò Phục vụ khi chưa ai chấm công | Không hiện combobox tên; không hiện "dùng chung" | TC, Auto (LoginPage.test) | P3 | |
| AUTH-18 | Tự đăng xuất 5 phút (UC-02) | Đăng nhập thu ngân hoặc pha chế, không thao tác 5 phút | Về `/login?expired=1`, thông báo "Phiên làm việc đã hết hạn." | TC | P2 | |
| AUTH-19 | Đăng xuất thủ công | Menu tài khoản → Đăng xuất | Về `/login`; gọi API sau đó nhận 401 | TC, Auto (AccessAndRealtimeTest) | P1 | |
| AUTH-20 | Chưa đăng nhập gọi API | `GET /api/ops/tables` không cookie | 401 `NO_SESSION` | API, Auto (AccessAndRealtimeTest) | P1 | |
| AUTH-21 | Sai vai trò gọi API | Đăng nhập Phục vụ, gọi `GET /api/ops/pending` | 403 `FORBIDDEN` | API, Auto (AccessAndRealtimeTest) | P1 | |
| AUTH-22 | Chặn truy cập chéo vai trò trên giao diện | Đăng nhập Phục vụ, gõ `/admin` hoặc `/cashier` | Không vào được, chuyển về trang chủ của vai trò | TC, Auto (RequireRole.test) | P1 | |
| AUTH-23 | Tài khoản bị khóa hẳn mất phiên | Chủ quán khóa nhân viên đang đăng nhập; nhân viên thao tác tiếp | 401 `ACCOUNT_LOCKED`, về trang đăng nhập | TC, API | P2 | |
| AUTH-24 | Đăng nhập khi đã có phiên | Mở `/login` khi đang đăng nhập | Tự chuyển về trang chủ vai trò | TC | P3 | |
| AUTH-25 | Phiên đổi mã sau đăng nhập | Đăng nhập hai lần cùng trình duyệt | Mã phiên mới; phiên cũ không dùng lại được | API | P3 | |

## 2. Chấm công (UC-28, UC-29)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| ATT-01 | Chấm công vào | `/attendance` → chọn vai trò Thu ngân → chọn tên → PIN riêng (Hồ Quốc Tiến `234567`) → vào ca | Báo thành công, ghi giờ vào và ca | TC, Auto | P1 | |
| ATT-02 | Chọn vai trò rồi tên | Chọn vai trò Phục vụ | Danh sách chỉ hiện người thuộc vai trò đó | TC | P1 | |
| ATT-03 | Tên không thuộc vai trò | Gọi `POST /api/auth/attendance/in` với tài khoản Phục vụ nhưng PIN/vai trò khác | Từ chối | API | P2 | |
| ATT-04 | Sai PIN chấm công | Nhập PIN sai | Báo sai PIN; sai 5 lần khóa 15 phút | TC | P2 | |
| ATT-05 | Chấm công vào hai lần | Chấm công vào khi chưa ra | Từ chối, báo đang trong ca | TC, API | P2 | |
| ATT-06 | Chấm công ra | Chấm công ra bằng PIN đúng | Ghi giờ ra; người đó không còn trong danh sách đang chấm công | TC, Auto | P1 | |
| ATT-07 | Chấm công ra khi chưa vào | Chấm công ra không có bản ghi vào | Từ chối với thông báo rõ | API | P3 | |
| ATT-08 | Tài khoản quầy không chấm công được | Dùng tài khoản dùng chung để chấm công | Từ chối | API | P2 | |
| ATT-09 | Trang `/attendance` luôn mở | Mở `/attendance` khi chưa đăng nhập | Vào được, không cần phiên | TC | P2 | |
| ATT-10 | Chủ quán chỉnh sửa chấm công (UC-29) | `/admin/staff` → Chấm công → sửa giờ vào/ra, nhập lý do | Lưu thành công; có dòng lịch sử chỉnh sửa (ai, khi nào, giá trị cũ/mới) | TC, Auto (MySqlAdminIntegrationTest) | P1 | |
| ATT-11 | Sửa giờ ra trước giờ vào | Sửa giờ ra < giờ vào | Từ chối kèm thông báo | TC, DB | P2 | |
| ATT-12 | Giao diện kiosk vừa màn hình | Thu nhỏ/phóng to cửa sổ | Khung đăng nhập/chấm công vừa khít, không bị cắt | TC | P3 | |

## 3. Nhân viên và tài khoản (UC-03, UC-04)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| STF-01 | Xem hồ sơ cá nhân (UC-03) | Vào `Profile` bằng bất kỳ vai trò | Hiện họ tên, vai trò, thông tin liên hệ | TC | P2 | |
| STF-02 | Cập nhật hồ sơ | Sửa họ tên/email/điện thoại hợp lệ → Lưu | Lưu thành công, hiển thị lại đúng | TC | P2 | |
| STF-03 | Hồ sơ nhập sai | Tên >100 ký tự; email >120; điện thoại không đủ 10 số hoặc không bắt đầu bằng 0 | Báo lỗi tại ô, không lưu | TC | P2 | |
| STF-04 | Thêm nhân viên (UC-04) | `/admin/staff` → Nhân viên → Thêm, nhập đủ thông tin | Nhân viên xuất hiện trong danh sách | TC, Auto | P1 | |
| STF-05 | Sửa nhân viên | Đổi chức vụ/thông tin | Lưu thành công | TC | P2 | |
| STF-06 | Khóa tài khoản nhân viên | Khóa một nhân viên | Không đăng nhập được nữa; phiên đang mở mất hiệu lực (AUTH-23) | TC, Auto | P1 | |
| STF-07 | Mở khóa tài khoản | Mở khóa nhân viên đã khóa tạm | Đăng nhập lại được sau khi chấm công | TC | P2 | |
| STF-08 | Vai trò khác không vào được quản lý nhân viên | Thu ngân gọi `GET /api/staff` | 403 | API | P1 | |

## 4. Thực đơn, topping, khuyến mãi (UC-05, UC-06, UC-27)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| MNU-01 | Danh sách thực đơn | `/admin/menu` | Thấy 30 món, nhóm, giá theo cỡ M/L | TC | P1 | |
| MNU-02 | Thêm món | Thêm món mới có hai cỡ giá | Món xuất hiện ở thực đơn và ở màn gọi món | TC, Auto | P1 | |
| MNU-03 | Sửa giá món | Đổi giá một cỡ | Màn gọi món hiện giá mới; đơn cũ giữ giá cũ | TC | P1 | |
| MNU-04 | Giá không hợp lệ | Giá âm, thập phân, hoặc >10.000.000 | Báo lỗi, không lưu | TC, Auto (DbInputTest) | P2 | |
| MNU-05 | Tạm hết hàng / bán lại | Đặt món sang Hết hàng, rồi đặt lại | Hết hàng thì phục vụ không chọn được; đặt lại thì chọn được | TC | P1 | |
| MNU-06 | Quy tắc topping theo nhóm | Mở món nhóm Sinh tố; mở Cappuccino/Espresso; mở cà phê khác | Sinh tố không có topping; Cappuccino/Espresso chỉ Shot espresso; cà phê khác có Kem cheese, Shot espresso, Pudding | TC | P1 | |
| MNU-07 | Thêm/sửa topping | Thêm topping có phụ phí | Hiện ở màn gọi món; phụ phí tối đa 10.000.000 | TC, Auto | P2 | |
| MNU-08 | Ảnh món | Chế độ **Ảnh** → Thêm/Đổi ảnh JPG <5 MB | Ảnh hiển thị ở thực đơn và màn gọi món | TC, Auto (MenuImageIntegrationTest) | P2 | |
| MNU-09 | Ảnh sai định dạng/quá lớn | Tải file .gif hoặc >5 MB | Từ chối với thông báo | TC, API | P2 | |
| MNU-10 | Phân quyền tải ảnh | Phục vụ gọi API tải ảnh | 403 | API, Auto | P2 | |
| MNU-11 | Tạo khuyến mãi (UC-27) | Tạo KM theo nhóm món + khung giờ + phần trăm | Lưu và hiển thị | TC, Auto | P1 | |
| MNU-12 | Khuyến mãi tự áp đúng khung giờ | Gọi món nhóm áp dụng trong và ngoài khung giờ | Trong khung giờ: giá giảm; ngoài khung: giá gốc | TC, Auto (PricingRulesIntegrationTest) | P1 | |
| MNU-13 | Khuyến mãi dữ liệu sai | Giờ bắt đầu ≥ giờ kết thúc; phần trăm ngoài 0–100 | Báo lỗi | TC, DB | P2 | |
| MNU-14 | Tắt khuyến mãi | Tắt một khuyến mãi đang chạy | Không còn áp vào đơn mới | TC | P2 | |

## 5. Bàn, gọi món, gọi thêm, chuyển bàn, hủy món (UC-07 → UC-11, UC-15)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| ORD-01 | Sơ đồ bàn | Phục vụ vào `/service` | Thấy 14 bàn, trạng thái đúng (Trống, Đang phục vụ…) | TC, Auto | P1 | |
| ORD-02 | Tạo đơn tại bàn trống | Chọn bàn → chọn món, cỡ, mức đường/đá, topping → Gửi | Tạo đơn, bàn chuyển trạng thái; món xuất hiện bên pha chế | TC, Auto (MySqlOpsIntegrationTest) | P1 | |
| ORD-03 | Người gửi đơn ghi đúng tên | Phục vụ A (đã chọn tên lúc đăng nhập) gửi đơn | `orders.created_by` = nhân viên A | API, Auto | P1 | |
| ORD-04 | Gửi đơn rỗng | Không chọn món → Gửi | Nút Gửi bị khóa hoặc báo lỗi | TC | P2 | |
| ORD-05 | Số lượng không hợp lệ | Số lượng 0, âm hoặc quá lớn | Từ chối | TC, API | P2 | |
| ORD-06 | Món hết hàng | Gửi món đang Hết hàng | Từ chối, nêu tên món | API, Auto | P1 | |
| ORD-07 | Bánh trừ kho, hủy hoàn kho | Gửi Tiramisu; hủy trước khi làm | Tồn bánh giảm 1 rồi hoàn lại | TC, Auto | P1 | |
| ORD-08 | Gọi thêm vào bàn đang phục vụ (UC09) | Mở lại bàn đang có đơn → thêm món → Gửi | Thêm lô mới vào cùng đơn, không tạo đơn thứ hai | TC, Auto | P1 | |
| ORD-09 | Gửi đồng thời vào một bàn | 8 yêu cầu cùng lúc vào một bàn trống | Chỉ tạo một đơn | API | P2 | |
| ORD-10 | Chuyển bàn (UC10) | Chuyển đơn từ bàn A sang bàn trống B | Bàn A trống, bàn B có đơn | TC, Auto | P1 | |
| ORD-11 | Chuyển sang bàn đang có đơn | Chọn bàn đã có khách | Từ chối | TC, API | P1 | |
| ORD-12 | Hủy món chưa làm (UC15) | Hủy dòng món trạng thái Mới | Dòng chuyển Hủy; tiền đơn giảm; có lý do | TC, Auto | P1 | |
| ORD-13 | Hủy món đã bắt đầu pha (BR-012) | Hủy dòng ở trạng thái Đang làm | Cho phép hủy, ghi hao hụt "Hủy món" và trừ nguyên liệu | TC, Auto | P1 | |
| ORD-14 | Hủy món đã xong | Hủy dòng đã Hoàn thành | Bị từ chối theo vai trò/quy tắc | TC, API | P2 | |
| ORD-15 | Phục vụ hoàn tất bàn (UC11) | Bấm hoàn tất/yêu cầu thanh toán | Đơn sang **Chờ thanh toán**; thu ngân thấy ngay | TC, Auto | P1 | |
| ORD-16 | Tùy chọn mức đá | Chọn các mức đá của đơn tại bàn | Không có mức **Đá riêng** (chỉ đơn mang đi) | TC | P2 | |
| ORD-17 | Vai trò không được gọi món | Thu ngân/Pha chế gọi `POST /api/ops/tables/{no}/orders` | 403 | API | P1 | |
| ORD-18 | Quản lý xem sơ đồ bàn | Chủ quán `/admin/tables` | Xem được 14 bàn | TC | P3 | |

## 6. Pha chế (UC-14)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| KIT-01 | Món mới hiện tức thời | Phục vụ gửi đơn khi đang mở màn Pha chế | Món hiện ngay, không cần tải lại | TC, Auto (AccessAndRealtimeTest) | P1 | |
| KIT-02 | Bắt đầu làm | Bấm **Bắt đầu** | Món sang Đang làm; nguyên liệu trừ theo công thức | TC, Auto | P1 | |
| KIT-03 | Hoàn thành | Bấm **Xong** | Món sang Hoàn thành; phục vụ được thông báo | TC, Auto | P1 | |
| KIT-04 | Thứ tự sự kiện | Gửi → bắt đầu → xong | Sự kiện đến theo đúng thứ tự | Auto | P2 | |
| KIT-05 | Thiếu nguyên liệu | Bắt đầu món khi kho thiếu | Từ chối; món bị đánh dấu Hết hàng bền vững | TC, Auto | P1 | |
| KIT-06 | Hai pha chế cùng bấm một món | Hai cửa sổ bấm Bắt đầu cùng lúc | Chỉ một thành công, bên kia nhận lỗi rõ ràng | API | P2 | |
| KIT-07 | Đề xuất hao hụt | Pha chế báo hao hụt kèm lý do | Hiện cho Chủ quán duyệt/ghi nhận | TC | P2 | |
| KIT-08 | Vai trò khác không dùng được | Phục vụ gọi `/api/ops/kitchen` | 403 | API | P1 | |
| KIT-09 | Tự đăng xuất 5 phút | Để màn pha chế không thao tác | Hết phiên theo AUTH-18 | TC | P3 | |

## 7. Kho: nguyên liệu, công thức, nhập, kiểm kê, hao hụt, cảnh báo (UC-16 → UC-21)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| INV-01 | Thêm nguyên liệu | `/admin/inventory` → Nguyên liệu → Thêm | Hiện trong danh sách với đơn vị, ngưỡng cảnh báo | TC, Auto | P1 | |
| INV-02 | Công thức món | Gán nguyên liệu và định lượng cho món | Pha món thì trừ đúng định lượng | TC, Auto | P1 | |
| INV-03 | Nhập kho | Nhập số lượng + hạn sử dụng hợp lệ | Tồn tăng đúng; có lô nhập | TC, Auto | P1 | |
| INV-04 | Hạn sử dụng không hợp lệ | Hạn ở quá khứ hoặc >5 năm | Từ chối | TC | P2 | |
| INV-05 | Số lượng nhập sai | Số lượng âm/0/chữ | Từ chối | TC | P2 | |
| INV-06 | Kiểm kê | Nhập số thực tế khác tồn sổ | Điều chỉnh tồn, ghi chênh lệch và lý do | TC, Auto | P1 | |
| INV-07 | Hao hụt | Ghi hao hụt (hỏng, đổ…) | Tồn giảm, có bản ghi hao hụt | TC, Auto | P1 | |
| INV-08 | Cảnh báo sắp hết | Giảm tồn xuống dưới ngưỡng | Hiện ở tab **Cảnh báo** | TC | P1 | |
| INV-09 | Cảnh báo sắp hết hạn | Có lô gần hạn | Hiện ở tab **Cảnh báo** | TC | P2 | |
| INV-10 | Tự bán lại sau khi nhập kho | Món đang Hết hàng do thiếu nguyên liệu → nhập đủ | Món tự trở lại bán được | TC, Auto | P1 | |
| INV-11 | Phân quyền kho | Thu ngân gọi API kho | 403 | API | P1 | |
| INV-12 | Tồn không âm | Bánh cuối cùng, 5 bàn đặt cùng lúc | Chỉ một bàn thành công, tồn không âm | API | P1 | |

## 8. Ca thu ngân, chốt ngày (UC-30 → UC-32)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| SHF-01 | Chưa mở ca thì không thu tiền | Thu ngân vào `/cashier` khi chưa mở ca | Thấy cảnh báo "Chưa mở ca…"; Chờ thanh toán và Đơn mang đi bị khóa | TC | P1 | |
| SHF-02 | Mở ca | Tab Ca thu ngân → Mở ca sáng, tiền đầu ca 500.000 | Ca mở; các tab được mở khóa ngay | TC, Auto (PaymentsPage.test) | P1 | |
| SHF-03 | Tiền đầu ca không hợp lệ | Âm, thập phân hoặc >100 triệu | Từ chối | TC, Auto (DbInputTest) | P2 | |
| SHF-04 | Chỉ một ca mở tại một lúc | Mở ca khi đã có ca đang mở | Từ chối | TC, API | P1 | |
| SHF-05 | Mỗi ca chỉ mở một lần/ngày | Chốt ca sáng rồi mở lại ca sáng | Từ chối; ca tối vẫn mở được | TC | P1 | |
| SHF-06 | Tab ca hiển thị | Xem tab Ca thu ngân | Hai ô ca sáng/tối của hôm nay (kèm tổng ngày) và 7 ngày gần nhất | TC | P3 | |
| SHF-07 | Tiền mặt dự kiến | Mở ca 500.000, thu 1 đơn tiền mặt 32.000 | Dự kiến = 532.000; chuyển khoản không cộng vào | TC, Auto | P1 | |
| SHF-08 | Chốt ca đúng | Nhập tiền kiểm đếm bằng dự kiến | Chênh lệch 0; ca đóng | TC, Auto | P1 | |
| SHF-09 | Chốt ca lệch tiền | Nhập kiểm đếm khác dự kiến | Lưu chênh lệch (thừa/thiếu) | TC | P1 | |
| SHF-10 | Chốt ca khi còn đơn nháp/chưa giao | Còn đơn mang đi chưa giao khách | 409 `UNDELIVERED`; giao xong mới chốt được | TC, Auto | P1 | |
| SHF-12 | Chốt ngày | Chủ quán `/admin/staff` → Ngày → Chốt ngày (hết ca mở) | Ngày đã chốt; không mở thêm ca | TC, Auto | P1 | |
| SHF-13 | Chốt ngày khi còn ca mở | Chốt ngày khi ca còn mở | Từ chối, nêu rõ việc còn dở | TC | P1 | |
| SHF-14 | Thông báo mở/chốt ca | Mở ca ở cửa sổ thu ngân 1 | Cửa sổ thu ngân 2 và Chủ quán cập nhật tức thời | TC | P2 | |
| SHF-15 | Thu ngân không chốt ngày | Thu ngân gọi API chốt ngày | 403 | API | P1 | |

## 9. Thanh toán và tính tiền (UC-22, BR về giá)

Quy tắc: khuyến mãi → dùng điểm (1 điểm = 1.000đ, tối đa 30% sau khuyến mãi, làm tròn xuống) → làm tròn 500đ → tích 1 điểm/10.000đ trên số tiền khách trả.

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| PAY-01 | Danh sách chờ thanh toán | Phục vụ hoàn tất bàn; thu ngân xem tab **Chờ thanh toán** | Đơn hiện đúng bàn, tổng tiền, theo thời gian thực | TC | P1 | |
| PAY-02 | Thanh toán tiền mặt đủ | Chọn tiền mặt, khách đưa ≥ tổng | Có hóa đơn; hiện tiền thối đúng | TC, Auto | P1 | |
| PAY-03 | Khách đưa thiếu | Tiền khách đưa < tổng | Nút thanh toán khóa/báo lỗi | TC | P1 | |
| PAY-04 | Tiền khách đưa quá trần | Nhập > 1 tỷ | Từ chối | TC, Auto | P3 | |
| PAY-05 | Chuyển khoản / QR | Chọn Chuyển khoản | Thanh toán không cần nhập tiền khách đưa; vào doanh thu chuyển khoản của ca | TC, Auto | P1 | |
| PAY-06 | Làm tròn 500đ | Đơn có tổng lẻ (ví dụ do khuyến mãi) | Tổng cuối là bội của 500đ | TC, Auto (PricingPolicyTest) | P1 | |
| PAY-07 | Trần điểm 30% | Đơn 87.500đ, khách dùng điểm | Dùng tối đa 26 điểm; nhập hơn thì bị cắt về 26 | TC, Auto (PricingPolicyTest) | P1 | |
| PAY-08 | Tính tiền khi dùng điểm | Đơn 87.500đ dùng 26 điểm | Tổng 61.500đ; tích thêm 6 điểm | TC, Auto | P1 | |
| PAY-09 | Điểm vượt số dư | Khách có 24 điểm, dùng 30 | Tối đa 24 điểm | TC | P1 | |
| PAY-10 | Điểm âm | Gọi API với `points` âm | 422 `BAD_POINTS` | API, Auto | P2 | |
| PAY-11 | Tích điểm | Thanh toán 100.000đ cho thành viên | +10 điểm; lịch sử điểm có dòng tích | TC, Auto | P1 | |
| PAY-12 | Khách lẻ không điểm | Không chọn thành viên | Không có phần dùng điểm/tích điểm | TC | P2 | |
| PAY-13 | Khuyến mãi trong hóa đơn | Thanh toán trong khung giờ KM | Hóa đơn ghi giảm KM trước, rồi mới tính điểm | TC, Auto | P1 | |
| PAY-14 | Thanh toán hai lần cùng đơn | 4 yêu cầu cùng thanh toán một đơn | Chỉ một hóa đơn được tạo | API | P1 | |
| PAY-15 | Bàn trống sau thanh toán | Thanh toán xong | Bàn về Trống; đơn rời danh sách chờ | TC, Auto | P1 | |
| PAY-16 | Người lập hóa đơn | Thu ngân A (đã chọn tên) thanh toán | `invoice.issued_by` = A; hóa đơn hiện "Nhân viên: A" | TC, API, Auto | P1 | |
| PAY-17 | Không còn ô chọn nhân viên phụ trách | Mở hộp thanh toán và tab Đơn mang đi | Không có ô "Nhân viên phụ trách" | TC | P1 | |
| PAY-18 | Thu ngân đã chấm công ra | Thu ngân A chấm công ra rồi vẫn thanh toán | 422 `NOT_ON_DUTY`; phải đăng nhập lại | API, Auto | P2 | |
| PAY-19 | Thanh toán khi chưa mở ca | Gọi API pay khi không có ca | Từ chối | API | P1 | |
| PAY-20 | Phân quyền thanh toán | Phục vụ gọi `POST /api/ops/orders/{id}/pay` | 403 | API | P1 | |

## 10. Đơn mang đi (UC-12)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| TKW-01 | Tạo đơn mang đi tiền mặt | Tab **Đơn mang đi** → chọn món lạnh/bánh → tiền mặt → thanh toán | Tạo đơn, hóa đơn, mã hàng chờ `#001`… | TC, Auto | P1 | |
| TKW-02 | Chỉ đồ lạnh và bánh | Xem danh sách món | Không có đồ nóng | TC | P2 | |
| TKW-03 | Mức đá riêng | Chọn món có mức **Đá riêng** | Lưu và hiển thị ở pha chế | TC, Auto | P1 | |
| TKW-04 | Đơn mang đi chuyển khoản → đơn nháp | Chọn Chuyển khoản, tạo đơn | Tạo **đơn nháp**, chưa có hóa đơn | TC, Auto | P1 | |
| TKW-05 | Xác nhận đơn nháp | Thu ngân kiểm tra tiền về → **Xác nhận** | Phát sinh hóa đơn; đơn chuyển vào pha chế | TC, Auto | P1 | |
| TKW-06 | Báo giá lại đơn nháp | Giá thay đổi (KM hết giờ) → **Báo giá lại** | Cập nhật tổng tiền | TC | P2 | |
| TKW-07 | Hủy đơn nháp | Bấm Hủy đơn nháp | Các dòng chuyển Hủy | TC, Auto | P2 | |
| TKW-08 | Chưa mở ca | Tạo đơn mang đi khi chưa có ca | Báo "Cần mở ca thu ngân mới tạo được đơn mang đi." | TC | P1 | |
| TKW-09 | Giao khách | Pha chế xong → thẻ **Chờ giao khách** → **Đã giao khách** | Đơn kết thúc; thẻ biến mất; giao lần hai 409 `ALREADY_HANDED` | TC, Auto | P1 | |
| TKW-10 | Chỉ thu ngân được báo xong | Pha chế hoàn thành đơn mang đi | Thông báo chỉ gửi cho Thu ngân, không gửi phục vụ | TC, Auto (NotificationBridgeTest) | P1 | |
| TKW-11 | Xem thông tin thành viên khi mang đi | Nhập số điện thoại thành viên | Nhận diện thành viên, dùng điểm được cho cả tiền mặt/chuyển khoản | TC | P2 | |
| TKW-12 | Chốt ca bị chặn khi còn chưa giao | Xem SHF-10 | Như SHF-10 | Auto | P1 | |

## 11. Hóa đơn: in lại, hủy, hoàn tiền (UC-13, UC-23, UC-24, UC-34)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| INVC-01 | Danh sách hóa đơn | `/admin/invoices` hoặc màn Hóa đơn của thu ngân | Hiện danh sách, lọc theo ngày | TC | P1 | |
| INVC-02 | Bộ lọc ngày hợp lệ | Chọn ngày tương lai; ngày bắt đầu > kết thúc; khoảng >366 ngày | Bị chặn/báo lỗi | TC | P2 | |
| INVC-03 | Xem chi tiết | Mở một hóa đơn | Hiện món, topping, KM, điểm, tổng, nhân viên, bố cục cân đối, chữ không xuống dòng | TC | P2 | |
| INVC-04 | In lại (UC-23) | Bấm In lại | Bản in khổ 80 mm đủ thông tin, có "Thu ngân: tên" | TC | P1 | |
| INVC-05 | Thu ngân chỉ xem/in lại | Thu ngân mở chi tiết hóa đơn | Không có nút Hủy/Hoàn tiền (BR-026, BR-031) | TC | P1 | |
| INVC-05b | In lại hóa đơn đã hủy (UC-23 E2) | Thu ngân mở hóa đơn đã hủy; Chủ quán mở cùng hóa đơn và bấm In lại | Thu ngân không có nút In lại, gọi API nhận 403; bản in của Chủ quán có dòng "ĐÃ HỦY" và dấu REPRINT | TC, Auto | P1 | |
| INVC-06 | Hủy hóa đơn (UC-24) | Chủ quán hủy hóa đơn, nhập lý do | Hóa đơn chuyển Hủy; hoàn điểm/kho theo quy tắc; doanh thu giảm | TC, Auto | P1 | |
| INVC-07 | Hoàn tiền một phần | Hoàn một số dòng | Số tiền hoàn theo tỷ lệ; lưu trên hóa đơn | TC, Auto (PricingRulesIntegrationTest) | P1 | |
| INVC-08 | Hoàn tiền toàn bộ | Hoàn hết | Trạng thái hoàn toàn bộ | TC, Auto | P1 | |
| INVC-09 | Hoàn vượt số đã thu | Hoàn nhiều hơn tổng | Từ chối | TC, API | P1 | |
| INVC-10 | Hủy dòng món đơn mang đi đã thanh toán (UC-13) | Chủ quán hủy một dòng của đơn mang đi đã trả tiền | Dòng bị hủy, hóa đơn điều chỉnh | TC | P2 | |
| INVC-11 | Hóa đơn bất biến | Cập nhật trực tiếp tiền trên hóa đơn bằng SQL | Trigger chặn (trừ trường được phép) | DB | P1 | |
| INVC-12 | Phân quyền hủy/hoàn | Thu ngân/Phục vụ gọi API hủy | 403 | API | P1 | |

## 12. Khách hàng thành viên (UC-25, UC-26)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| CUS-01 | Tra cứu bằng SĐT | Nhập `0912345678` ở màn thu ngân | Hiện Nguyễn Thị Hoa, 24 điểm | TC | P1 | |
| CUS-02 | Không tìm thấy | Nhập SĐT chưa đăng ký | Gợi ý đăng ký mới | TC | P1 | |
| CUS-03 | Đăng ký thành viên | Nhập tên + SĐT đúng 10 số | Tạo thành viên, 0 điểm | TC, Auto | P1 | |
| CUS-04 | SĐT sai định dạng | Chỉ 9 số, có chữ, không bắt đầu 0 | Chặn nhập/báo lỗi | TC | P1 | |
| CUS-05 | SĐT trùng | Đăng ký lại cùng SĐT | Từ chối `trùng` | TC, DB | P1 | |
| CUS-06 | Tên quá dài | >100 ký tự | Chặn | TC | P3 | |
| CUS-07 | Danh sách khách (Chủ quán) | `/admin/customers` | Thấy danh sách, điểm, lịch sử điểm | TC | P2 | |
| CUS-08 | Điểm khớp lịch sử | Sau vài giao dịch tích/dùng điểm | Số dư = tổng lịch sử | DB | P1 | |

## 13. Báo cáo (UC-33)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| RPT-01 | Doanh thu theo ngày | `/admin` chọn khoảng ngày | Tổng doanh thu bằng tổng hóa đơn hợp lệ trong khoảng | TC, Auto | P1 | |
| RPT-02 | Món bán chạy | Xem top món | Sắp xếp theo số lượng bán | TC | P1 | |
| RPT-03 | Hóa đơn hủy không tính doanh thu | Hủy một hóa đơn rồi xem báo cáo | Doanh thu giảm tương ứng | TC | P1 | |
| RPT-04 | Hoàn tiền trừ doanh thu | Hoàn một phần rồi xem báo cáo | Doanh thu trừ phần hoàn | TC | P2 | |
| RPT-05 | Ngày không dữ liệu | Chọn ngày chưa có hóa đơn | Hiện trạng thái trống, không lỗi | TC | P2 | |
| RPT-06 | Phân quyền báo cáo | Thu ngân gọi API báo cáo | 403 | API | P1 | |
| RPT-07 | Số liệu khớp SQL | So sánh với truy vấn trực tiếp | Khớp | DB | P2 | |

## 14. Thông báo thời gian thực (WebSocket)

| Mã | Mô tả | Các bước | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| RT-01 | Chuông thông báo | Pha chế xong món | Phục vụ nhận thông báo, chuông hiện số chưa đọc | TC | P1 | |
| RT-02 | Chỉ gửi đúng kênh/vai trò | Đơn mang đi xong | Chỉ thu ngân nhận | Auto | P1 | |
| RT-03 | Chỉ gửi sau commit | Giao dịch rollback | Không có thông báo | Auto (NotificationAfterCommitTest) | P1 | |
| RT-04 | Đăng ký kênh sai vai trò | Phục vụ đăng ký kênh pha chế | Bị từ chối | API | P2 | |
| RT-05 | Mất kết nối rồi nối lại | Tắt rồi bật mạng/backend | Tự kết nối lại, dữ liệu đồng bộ | TC | P2 | |
| RT-06 | Đăng xuất ngắt kết nối | Đăng xuất | WebSocket đóng | TC | P3 | |

## 15. Ràng buộc nhập liệu (giao diện + backend)

| Mã | Trường | Giá trị thử | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| VAL-01 | Số điện thoại | 9 số; 11 số; `1234567890`; chữ | Từ chối; chỉ chấp nhận đúng 10 số bắt đầu 0 | TC, API | P1 | |
| VAL-02 | Tiền đầu ca | -1; 1,5; 100.000.001 | Từ chối; tối đa 100 triệu | TC, Auto | P2 | |
| VAL-03 | Tiền kiểm đếm / khách đưa | Âm; thập phân; >1 tỷ | Từ chối | TC, Auto | P2 | |
| VAL-04 | Giá bán / phụ phí | >10.000.000 | Từ chối | TC, Auto | P2 | |
| VAL-05 | Tên | 101 ký tự | Từ chối; tối đa 100 | TC, Auto | P3 | |
| VAL-06 | Email | 121 ký tự | Từ chối; tối đa 120 | TC | P3 | |
| VAL-07 | Lý do | 256 ký tự | Từ chối; tối đa 255 | TC | P3 | |
| VAL-08 | Hạn sử dụng | Quá khứ; +5 năm 1 ngày | Từ chối | TC | P2 | |
| VAL-09 | Bộ lọc ngày | Tương lai; đảo ngược; >366 ngày | Chặn | TC | P2 | |
| VAL-10 | Số nguyên quá dài | Số 30 chữ số | Báo lỗi, không lỗi 500 | API, Auto (DbInputTest) | P2 | |

## 16. Quy tắc CSDL (trigger, CHECK, UNIQUE)

36 kịch bản đã có trong `database/run_tests.py`, chạy bằng `MYSQL_PWD='<mật khẩu>' python3 database/run_tests.py`. Nhóm kiểm tối thiểu:

| Mã | Quy tắc | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|
| DB-01 | Hai ca mở cùng lúc | Trigger chặn | DB | P1 | |
| DB-02 | Mở lại ca đã dùng trong ngày | Chặn (UNIQUE) | DB | P1 | |
| DB-03 | Chốt ca khi còn đơn chưa giao/đơn nháp | Chặn | DB | P1 | |
| DB-04 | Sửa tiền hóa đơn đã phát hành | Chặn | DB | P1 | |
| DB-05 | Tồn kho âm | Chặn | DB | P1 | |
| DB-06 | Trùng SĐT thành viên | Chặn (UNIQUE) | DB | P1 | |
| DB-07 | Giá/số lượng âm | Chặn (CHECK) | DB | P2 | |
| DB-08 | Ngày đã chốt mở thêm ca | Chặn | DB | P1 | |
| DB-09 | Khóa ngoại: xóa nhân viên đã lập hóa đơn | Chặn | DB | P2 | |
| DB-10 | Flyway dựng sạch | 28 bảng, 15 trigger, 5 view, dữ liệu mẫu | Auto | P1 | |

## 17. Phi chức năng

| Mã | Yêu cầu | Cách kiểm | Kết quả mong đợi | Loại | Ưu tiên | Kết quả |
|---|---|---|---|---|---|---|
| NFR-01 | Bảo mật mật khẩu/PIN | Xem cột `secret_hash` | Lưu bcrypt, không lưu rõ | DB, Auto | P1 | |
| NFR-02 | Cookie phiên | Xem cookie đăng nhập | Cookie phiên do máy chủ cấp; HttpOnly | TC | P2 | |
| NFR-03 | Giao diện theo thiết bị | Phục vụ trên điện thoại (360–430 px); pha chế trên màn lớn; thu ngân trên máy tính | Bố cục dùng được, không cuộn ngang, nút đủ lớn | TC | P2 | |
| NFR-04 | Thu nhỏ/phóng to trình duyệt | Phóng 150%, thu 80% màn đăng nhập | Khung vừa chiều cao, không cắt | TC | P3 | |
| NFR-05 | Tải trang | Mở các màn chính với dữ liệu mẫu | Phản hồi nhanh, không lỗi console | TC | P3 | |
| NFR-06 | Lỗi mạng | Tắt backend khi đang dùng | Hiện thông báo lỗi dễ hiểu, không trắng trang | TC | P2 | |
| NFR-07 | Ngôn ngữ | Duyệt mọi màn | Thông báo và nhãn bằng tiếng Việt | TC | P3 | |
| NFR-08 | Swagger | Mở `/swagger-ui.html` | Tải được tài liệu API | TC | P3 | |
| NFR-09 | Chế độ giả lập (không MySQL) | Chạy `dev-start` giả lập | Luồng gọi món → pha chế → thanh toán cơ bản chạy; màn quản trị không dùng được | TC | P3 | |

## 18. Kịch bản tích hợp đầu-cuối

| Mã | Kịch bản | Các bước chính | Kết quả mong đợi | Ưu tiên | Kết quả |
|---|---|---|---|---|---|
| E2E-01 | Một ly nước từ gọi món đến báo cáo | Chấm công 3 vai trò → mở ca → phục vụ gửi đơn → pha chế làm → hoàn tất bàn → thu ngân thanh toán có điểm → xem báo cáo | Mọi bước thành công; tiền, điểm, kho, báo cáo khớp nhau | P1 | |
| E2E-02 | Đơn mang đi chuyển khoản | Tạo đơn nháp → xác nhận → pha chế xong → giao khách → chốt ca | Chốt ca chỉ được sau khi giao; doanh thu chuyển khoản tách khỏi tiền mặt | P1 | |
| E2E-03 | Hủy và hoàn tiền | Thanh toán → Chủ quán hoàn một phần → xem báo cáo/điểm | Doanh thu, điểm, kho điều chỉnh đúng | P1 | |
| E2E-04 | Quy trình ngày | Mở ca sáng/chốt → ca tối/chốt → chốt ngày | Không mở được ca mới sau chốt ngày | P1 | |
| E2E-05 | Phân quyền chéo | Mỗi vai trò thử truy cập màn và API của vai trò khác | Giao diện chuyển hướng; API 403 | P1 | |
| E2E-06 | Truy vết người thao tác | Phục vụ A gửi đơn, thu ngân B thanh toán | `created_by` = A, `issued_by` = B, hiện đúng trên hóa đơn in | P1 | |

---

## Tóm tắt phạm vi

| Nhóm | Số case |
|---|---|
| Đăng nhập, phiên, phân quyền | 26 |
| Chấm công | 12 |
| Nhân viên và tài khoản | 8 |
| Thực đơn, topping, khuyến mãi | 14 |
| Gọi món, bàn, hủy món | 18 |
| Pha chế | 9 |
| Kho | 12 |
| Ca và chốt ngày | 15 |
| Thanh toán, tính tiền | 20 |
| Đơn mang đi | 12 |
| Hóa đơn | 12 |
| Khách hàng | 8 |
| Báo cáo | 7 |
| Thời gian thực | 6 |
| Ràng buộc nhập liệu | 10 |
| Quy tắc CSDL | 10 |
| Phi chức năng | 9 |
| Đầu-cuối | 6 |
| **Tổng** | **214** |

## Ghi chú

- Số tiền, mã lỗi (`NOT_CHECKED_IN`, `STAFF_REQUIRED`, `NOT_ON_DUTY`, `UNDELIVERED`, `ALREADY_HANDED`, `BAD_POINTS`) lấy từ mã nguồn hiện tại; nếu sửa mã lỗi hoặc thông báo thì cập nhật case tương ứng.
- Các case loại `Auto` chỉ bảo đảm khi chạy `mvn -f backend/pom.xml verify` (cần Docker) và `npm --prefix frontend run test`.
- Một số case (đặc biệt VAL, NFR, RT-04, INVC-10, STF-07) cần chạy tay để xác nhận vì chưa có test tự động; kết quả ghi ở cột cuối của bảng.
