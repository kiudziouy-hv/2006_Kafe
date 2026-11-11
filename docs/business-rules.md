# Quy tắc vận hành và phạm vi chưa làm

Tách từ README gốc. Quy tắc tính tiền (khuyến mãi, điểm, làm tròn 500đ) vẫn nằm ở mục 1 của [README](../README.md).

## Quy tắc vận hành nổi bật (đã làm, backend và trigger CSDL thực thi, giao diện chỉ hỗ trợ):
- **Chấm công mới được đăng nhập.** Nhân viên (thu ngân, phục vụ, pha chế) chỉ đăng nhập được khi đã chấm công vào ca: tài khoản cá nhân thì chính người đó đang chấm công; tài khoản quầy dùng chung thì phải có ít nhất một nhân viên cùng vai trò đang chấm công. Chủ quán/Quản lý không bị ràng buộc. Trang `/attendance` luôn mở, và chỉ chặn lúc đăng nhập (phiên đang mở không bị ngắt khi chấm công ra). Chấm công chọn **vai trò rồi tên**, backend từ chối nếu tên không thuộc vai trò đã chọn.
- **Nhân viên phụ trách.** Thu ngân và Phục vụ là người trong ca: lúc đăng nhập các vai trò này, chọn tên trong số người cùng vai trò đang chấm công (cần chấm công trước); phiên đó gửi đơn tại bàn (`created_by`), lập đơn mang đi, xác nhận đơn nháp, thanh toán đơn tại bàn, và tên được lưu vào hóa đơn (`issued_by`), đơn mang đi (`created_by`), hiện trên hóa đơn in. Màn thu tiền không còn ô chọn người.
- **Ca thu ngân.** Mỗi lúc một ca mở; mỗi ca (sáng, tối) chỉ mở một lần trong ngày; ngày đã chốt thì không mở thêm. Tab *Ca thu ngân* hiện hai ô ca sáng và ca tối của hôm nay (kèm tổng ngày) và 7 ngày gần nhất. Mở hoặc chốt ca được báo thời gian thực cho mọi cửa sổ thu ngân và Chủ quán. Hệ thống **không** ràng buộc theo giờ thật nên demo giờ nào cũng mở được ca.
- **Đơn mang đi.** Có mức đá **Đá riêng** (chỉ đơn mang đi). Pha chế xong thì chỉ **Thu ngân** được báo và là người **giao khách** (nút *Đã giao khách* ở thẻ *Chờ giao khách*). **Chốt ca bị chặn** khi còn đơn nháp hoặc còn đơn mang đi chưa giao khách (cả backend lẫn trigger CSDL). Ca hiện thêm doanh thu chuyển khoản/QR để đối chiếu với app ngân hàng; số này không tính vào tiền mặt dự kiến.
- **Thực đơn.** Nhóm *Sinh tố* không có topping; cà phê giữ Kem cheese, Shot espresso, Pudding (Cappuccino và Espresso chỉ Shot espresso).
- **Ràng buộc nhập liệu.** Số điện thoại đúng 10 số bắt đầu bằng 0; tiền không âm, không thập phân, có trần (tiền đầu ca 100 triệu, tiền kiểm đếm và khách đưa 1 tỷ, giá bán và phụ phí 10 triệu); tên tối đa 100 ký tự, email 120, lý do 255; hạn sử dụng nguyên liệu không ở quá khứ và không quá 5 năm; bộ lọc ngày không chọn tương lai, không đảo ngược và tối đa 366 ngày.

## Chưa làm
- Xuất Excel, dashboard, báo cáo theo khung giờ.
- **Nhật ký thao tác (Audit Log): không làm.** Hệ thống chỉ có bảng chấm công (mục *Nhân sự & ca*) để biết ai trực ca nào, và các chỉnh sửa chấm công được ghi lại cùng lịch sử. Thao tác ở máy thu ngân và điện thoại phục vụ ghi theo tên người chọn lúc đăng nhập (đơn, hóa đơn, ca), còn màn hình pha chế dùng tài khoản dùng chung nên không truy được từng người. Các thao tác của pha chế muốn biết ai làm thì đối chiếu giờ thao tác với bảng chấm công của ca đó; việc truy vết sâu hơn do quán tự xử lý ngoài hệ thống: hỏi nhân viên trực ca và trích camera.
- **Bắt đổi PIN lần đầu: không làm.** Nhân viên chỉ nhập PIN của vai trò và tài khoản vẫn dùng chung, nên PIN riêng không xác định được người thao tác; PIN chỉ là lớp bảo vệ đăng nhập.
- **Điều chỉnh so với yêu cầu gốc:** yêu cầu gốc ghi mỗi nhân viên một tài khoản riêng, kể cả khi dùng máy chung, và mỗi thao tác ghi theo tài khoản đang đăng nhập. Nhóm chọn tài khoản dùng chung theo vai trò cho các thiết bị quầy vì giờ cao điểm 1 đến 2 người luân phiên trên cùng một màn hình, đổi tài khoản cho từng thao tác thì không kịp, và phiên của thu ngân, pha chế tự hết sau 5 phút (phục vụ 8 giờ). Với thu ngân và phục vụ, lúc đăng nhập người dùng chọn thêm tên mình trong số người đang chấm công, nên đơn và hóa đơn vẫn ghi đúng người; pha chế chỉ thể hiện vai trò. Người trực ca được biết qua chấm công bằng tài khoản cá nhân.
- **Cảnh báo đơn chờ pha chế quá 10 phút:** chưa có.

Hoàn tiền không đi qua ngân hàng: Chủ quán trả tiền ngoài hệ thống rồi xác nhận trên hệ thống.
