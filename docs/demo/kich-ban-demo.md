# Kịch bản demo 2006 Kafé

Dùng cho buổi trình bày trước giảng viên hoặc hội đồng. Thời lượng đầy đủ khoảng 34 phút, có bản rút gọn 25 phút (mục 5). 12 cảnh nối nhau thành một ngày bán hàng. Mỗi cảnh ghi rõ ai làm, ở màn hình nào, bấm gì, kết quả cần thấy và quy tắc nghiệp vụ được chứng minh (mã UC, BR, ASM theo RAD).

## 1. Chuẩn bị (trước giờ demo 15 phút)

**Dựng dữ liệu trống.** Ở thư mục gốc dự án:
```
scripts/dev-mysql.sh
```
Mỗi lần chạy, hệ thống dựng lại cơ sở dữ liệu: có dữ liệu nền, chưa có đơn, hóa đơn hay ca thu ngân nào. Chờ terminal báo giao diện ở `http://localhost:5173`.

**Mở 4 phiên đăng nhập độc lập.** Phiên lưu bằng cookie theo địa chỉ `localhost`, nên 4 vai trò **không thể dùng chung một trình duyệt** (đăng nhập vai trò sau sẽ đè phiên vai trò trước). Dùng 4 trình duyệt hoặc hồ sơ khác nhau, hoặc điện thoại cho Phục vụ:

| Cửa sổ | Vai trò | Đăng nhập | Địa chỉ sau đăng nhập |
|---|---|---|---|
| A | Chủ quán / Quản lý | tab **Quản lý**: `owner` / `admin123` | `/admin` |
| B | Phục vụ | tab **Nhân viên** → Phục vụ → PIN `123456` | `/service` |
| C | Pha chế | tab **Nhân viên** → Pha chế → PIN `345678` | `/kitchen` |
| D | Thu ngân | tab **Nhân viên** → Thu ngân → PIN `234567` | `/cashier` |

Bố trí màn hình: C và D cạnh nhau (thấy đơn chạy từ phục vụ sang pha chế), A ở màn hình lớn để mở báo cáo.

**PIN chấm công:** ở dữ liệu mẫu PIN theo vai trò, đồng bộ với đăng nhập: thu ngân `234567`, phục vụ `123456`, pha chế `345678`. Ở `/attendance` mỗi người chọn vai trò, chọn tên của mình trong danh sách vai trò đó rồi nhập PIN của vai trò đó.

**Kiểm tra nhanh (2 phút):** đăng nhập đủ 4 cửa sổ, vào `/admin/tables` thấy 14 bàn Trống, vào `/admin/menu` thấy 30 món. Để chỉ chạy lại bước này khi lỗi: `Ctrl+C` rồi `scripts/dev-mysql.sh`.

**Lưu ý trước khi bắt đầu**
- Thu ngân và pha chế **tự đăng xuất sau 5 phút** không thao tác (UC-02). Giữ máy hoạt động trong lúc nói, hoặc dùng chính điều này làm điểm nhấn ở Cảnh 2.
- **Khung giờ khuyến mãi** của dữ liệu nền: Tea Happy Hour (14:00–16:00, giảm 15% nhóm Trà) và Cake Evening (20:00–21:30, giảm 10% nhóm Bánh). Các con số tính tiền trong kịch bản ghi cho **ngoài hai khung giờ này**. Demo trong khung giờ đó thì món liên quan tự được giảm, số tiền sẽ khác; việc này không làm kịch bản hỏng, chỉ cần đọc số trên màn hình thay vì số mẫu.
- Mọi số tiền mẫu dưới đây lấy từ dữ liệu nền: Trà đào cam sả M 45.000đ, Tiramisu 45.000đ, Cà phê sữa L 39.000đ, Trà vải M 42.000đ, Trân châu đen +8.000đ. Khách Nguyễn Thị Hoa `0912345678` có 24 điểm.
- Nếu một bước lỗi, xem mục 4 (xử lý sự cố).

## 2. Các cảnh

### Cảnh 1. Giới thiệu hệ thống (1 phút)
Nói ngắn: quán 14 bàn, 1 chi nhánh, 4 vai trò, 4 loại thiết bị. Hệ thống số hóa chuỗi gọi món → pha chế → trừ kho → thanh toán → in hóa đơn, kèm ca, thành viên, báo cáo. Chạy trong mạng nội bộ, không phụ thuộc dịch vụ bên ngoài.

### Cảnh 2. Đăng nhập và phân quyền (UC-01, UC-02, BR-042) (2 phút)
1. **Cửa sổ A:** màn đăng nhập, tab **Quản lý**, đăng nhập `owner` / `admin123`. Chỉ ra Chủ quán dùng tên và mật khẩu, nhân viên dùng PIN 6 số.
1a. **Chấm công trước khi đăng nhập:** nhân viên chỉ vào được hệ thống khi đã chấm công. Chưa ai chấm công thì chọn vai trò Thu ngân, nhập đúng PIN vẫn bị chặn với thông báo **"Chưa có nhân viên nào chấm công vào ca"**. Mở `/attendance`, chấm công vào cho một thu ngân cá nhân (ví dụ **Hồ Quốc Tiến**, PIN `234567`), một phục vụ (**Võ Tấn Phát**, `123456`) và một pha chế (**Trần Thanh Huy**, `345678`) rồi mới đăng nhập các vai trò. Chủ quán không bị ràng buộc này.
2. **Cửa sổ D:** chọn vai trò Thu ngân, nhập sai PIN `000000`. Thấy thông báo **"Mã PIN không đúng. Còn 4 lần thử."** Nói: sai 5 lần liên tiếp thì khóa 15 phút (không làm cho đến hết lần để khỏi mất thời gian). Sau đó nhập đúng `234567`.
3. Chỉ ra phân quyền: mỗi vai trò vào một giao diện riêng (thu ngân không thấy kho, phục vụ không thấy báo cáo). Quyền thật nằm ở backend, ẩn nút ở giao diện chỉ để thân thiện (xem [api-permissions.md](../api/api-permissions.md)).
4. Nhắc: thu ngân và pha chế tự đăng xuất sau 5 phút; mật khẩu và PIN lưu dạng băm bcrypt.

### Cảnh 3. Chủ quán chuẩn bị: nhân sự, thực đơn, khuyến mãi (UC-03, 04, 05, 06, 27) (4 phút)
**Cửa sổ A.**
1. **Nhân sự & ca** → tab **Nhân viên**: danh sách nhân viên, trạng thái tài khoản; bấm **Thêm nhân viên** (Họ tên, Vai trò, **Mã PIN ban đầu**, Email, Số điện thoại) rồi **Lưu**. Chỉ ra **Khóa/Mở khóa** (nghỉ việc thì khóa, không xóa để giữ lịch sử, BR-042) và **Đặt lại PIN**.
2. **Thực đơn** → tab **Món**: mở một món, chỉ ra kích cỡ M/L và giá từng cỡ, cấu hình nóng/lạnh (Cappuccino chỉ M và chỉ nóng), trạng thái **Đang bán / Hết hàng / Ngừng bán**. Bấm **Thêm món** tạo "Món thử demo" rồi **Xóa món** để chứng minh: món **chưa có giao dịch xóa được** (ASM-22); món đã bán chỉ chuyển Ngừng bán (BR-007).
3. Tab **Topping**: topping và phụ phí (Trân châu đen +8.000đ).
4. Tab **Khuyến mãi**: chỉ ra hai chương trình có sẵn, rồi **Tạo chương trình** "Demo giảm giá" giảm 20% nhóm **Sinh tố** (nhóm này không dùng trong các cảnh sau nên không làm lệch số tiền mẫu), **Giờ bắt đầu mỗi ngày** là giờ hiện tại, **Giờ kết thúc** là 1 giờ sau, **Lưu và kích hoạt**. Nói: món trùng hai chương trình thì lấy mức cao hơn; giá và khuyến mãi chốt tại thời điểm gửi món. Muốn thấy giảm giá thật thì cho phục vụ gọi một Sinh tố ở Cảnh 5 và đọc số trên hộp thanh toán.
5. **Chấm công:** chỉ ra trang `/attendance` (liên kết "Chấm công vào / ra ca" ở màn đăng nhập), cùng khung giao diện với màn đăng nhập: bấm tab **Chấm công vào** (hoặc **Chấm công ra**), chọn **vai trò** (ví dụ Thu ngân), chọn tên trong danh sách của vai trò đó (ví dụ **Hồ Quốc Tiến**), chọn **Ca sáng (07:00 – 14:30)** hoặc **Ca tối (14:30 – 22:00)** (chỉ khi chấm công vào), rồi nhập PIN `234567` và bấm OK. Chủ quán sửa chấm công ở **Nhân sự & ca → Chấm công → Chỉnh sửa**; mỗi lần sửa lưu người sửa, thời điểm, dữ liệu trước và sau.

### Cảnh 4. Thu ngân mở ca (UC-30, ASM-15) (1 phút)
**Cửa sổ D** (`/cashier`).
1. Khung ca báo chưa mở. Thử chuyển tab **Chờ thanh toán**: chưa thanh toán được vì chưa có ca.
2. Bấm **Mở ca thu ngân**, chọn **Ca tối (14:30 – 22:00)** (ca tối là ca chốt ngày, dùng cho Cảnh 11), nhập **Tiền mặt đầu ca (đồng)** `500000`, bấm **Mở ca**. Thấy **Đang mở**, giờ mở.

### Cảnh 5. Phục vụ gọi món tại bàn (UC-07, 08, 09, 10) (3 phút)
**Cửa sổ B** (`/service`), nên làm trên điện thoại hoặc cửa sổ thu hẹp.
1. Sơ đồ 14 bàn (8 trong nhà, 6 ngoài trời), tất cả Trống. Chọn **bàn 3** → **Gọi món**.
2. Mục **Chọn món**: chọn **Trà đào cam sả**, **Kích thước** M, **Mức đường** 50, mức đá Bình thường, **Topping** Trân châu đen, số lượng 1, bấm **Thêm · giá** (53.000đ). Chọn tiếp **Tiramisu** (bánh không có tùy chọn) → 45.000đ.
3. Giỏ **Món đã chọn** (Tạm tính 98.000đ) → bấm **Gửi order**. Thông báo **"Đã gửi order xuống quầy pha chế"**.
4. **Chuyển sang cửa sổ C**: món đã hiện trên màn hình pha chế trong chưa đầy 2 giây (FR-M03-009). Nhấn mạnh đây là thời gian thực qua WebSocket.
5. **Gọi thêm** (UC-09): quay lại bàn 3, chọn thêm **Cà phê sữa** M, bấm **Gửi thêm món**. Vẫn là cùng một đơn, ghi nhận lượt gửi riêng.
6. **Chuyển bàn** (UC-10): bấm **Chuyển bàn**, **Chuyển sang bàn trống** → bàn 5 (bàn 3 về Trống). Rồi chuyển lại từ bàn 5 về bàn 3 để các cảnh sau vẫn dùng bàn 3. Nói: chỉ chuyển sang bàn đang Trống, không hỗ trợ gộp bàn.

### Cảnh 6. Pha chế làm món, trừ kho tự động (UC-14, 15; BR-012) (3 phút)
**Cửa sổ C** (`/kitchen`).
1. Các món xếp theo thứ tự đến trước làm trước (FIFO), mỗi món ghi bàn hoặc số thứ tự.
2. **Trước khi pha:** chuyển sang cửa sổ A → **Kho** → tab **Nguyên liệu**, ghi lại tồn kho của một nguyên liệu trong công thức của món vừa gọi (ví dụ đường hoặc đá viên).
3. **Cửa sổ C:** bấm **Bắt đầu pha** ở món đầu tiên (Mới → **Đang pha**).
4. **Quay lại cửa sổ A**, tải lại tab **Nguyên liệu**: tồn kho đã **giảm đúng theo công thức** (nguyên liệu, ly, nắp, topping). Đây là điểm nhấn: trừ kho khi chuyển sang Đang pha, không phải lúc gọi món.
5. Bấm **Hoàn thành** → trạng thái **Đã xong**. Cửa sổ B và D nhận thông báo món đã xong. Làm hết các món của bàn 3.
6. Chỉ ra bánh (Tiramisu) cũng đi qua cùng quy trình Mới → Đang pha → Đã xong (Đang pha là lúc lấy bánh), tồn kho bánh đã bị trừ từ lúc gửi order.

### Cảnh 7. Phục vụ xác nhận khách dùng xong, thu ngân thanh toán (UC-11, 22; BR-021) (4 phút)
1. **Cửa sổ B:** vào bàn 3, bấm **Khách đã dùng xong**. Bàn chuyển **Chờ thanh toán**. Chỉ ra: nếu còn món chưa xong thì nút bị khóa; nếu khách gọi thêm lúc này, bàn quay lại Đang phục vụ.
2. **Cửa sổ D:** tab **Chờ thanh toán** hiện bàn 3. Bàn đang phục vụ thì báo **"Bàn đang phục vụ, chưa thể thanh toán"**. Bấm **Thanh toán**.
3. Ở hộp thanh toán, nhập số điện thoại `0912345678` để nhận diện thành viên **Nguyễn Thị Hoa** (24 điểm). Nhập **Số điểm dùng** `10` (tối đa 30% giá trị đơn, 1 điểm = 1.000đ).
4. Đọc dòng tính tiền theo đúng thứ tự: Tạm tính 98.000đ → khuyến mãi (nếu có) → trừ 10.000đ điểm → **Khách phải trả 88.000đ** (đã làm tròn 500đ) → sẽ tích **8 điểm** (10.000đ = 1 điểm). Chọn **Tiền mặt**, **Tiền khách đưa** `100000` → **Tiền thối** 12.000đ.
5. Bấm **Xác nhận thanh toán** → **Thanh toán thành công**; bấm **In hóa đơn** (bản in khổ 80 mm, "Giá đã bao gồm thuế"). Bàn 3 về Trống.
6. **Sang Cửa sổ A → Thành viên:** tìm `0912345678`, thấy điểm còn **22** (24 − 10 + 8) cùng **Lịch sử điểm** (Dùng điểm, Tích điểm) và **Lịch sử giao dịch**.
7. Nhắc: Chuyển khoản/QR cũng là một lựa chọn; nhân viên tự kiểm tra tiền về, hệ thống không nối ngân hàng. Một hóa đơn không thể thanh toán hai lần.

### Cảnh 8. Đơn mang đi: tiền mặt và chuyển khoản/QR (UC-12; BR-009) (3 phút)
**Cửa sổ D**, tab **Đơn mang đi**.
1. **Đơn tiền mặt:** **Chọn món mang đi** (chỉ đồ uống lạnh và bánh; thử tìm Cappuccino sẽ không có). Chọn **Cà phê sữa** cỡ L × 2 (78.000đ). Chọn **Tiền mặt**, **Tiền khách đưa** `100000`, xác nhận (nút thanh toán và gửi pha chế). Đơn nhận **số thứ tự #001** và hiện ngay ở cửa sổ C.
2. **Đơn chuyển khoản/QR:** chọn **Trà vải** M (42.000đ), phương thức Chuyển khoản/QR. Đơn là **Đơn nháp chờ chuyển khoản**: chưa hiện ở màn hình pha chế, chưa giữ nguyên liệu, chưa có hóa đơn. Nói: khách chuyển xong, thu ngân kiểm tra ứng dụng ngân hàng, tick **Đã nhận đủ tiền, xác nhận đơn**; đơn mới được xác nhận, nhận số **#002** và xuống pha chế. Cho thấy nút **Hủy** đơn nháp nếu muốn.
3. **Chuẩn bị cho Cảnh 9:** tạo thêm một đơn mang đi **tiền mặt gồm 2 dòng** (Cà phê sữa M và Brownie), thanh toán xong nhưng **chưa cho pha chế làm**.
4. **Cửa sổ C:** làm hai đơn #001 và #002 (Bắt đầu pha → Hoàn thành), để nguyên đơn thứ ba. Số thứ tự hiện để gọi khách.
5. **Nhân viên phụ trách:** ở các cảnh thu tiền, ô **Nhân viên phụ trách** liệt kê thu ngân đang chấm công (cần chấm công bằng tài khoản cá nhân trước); chọn tên rồi mở hóa đơn sẽ thấy đúng tên đó ở "Nhân viên" và trên bản in. Chưa ai chấm công thì ô bị khóa và hóa đơn ghi "Quầy Thu ngân".
6. **Giao khách:** pha chế xong, chỉ **Thu ngân** nhận thông báo "#001 xong, gọi khách nhận" (Phục vụ không nhận). Ở cửa sổ D, thẻ **Chờ giao khách** của tab **Đơn mang đi** hiện nút **Đã giao khách** cho đơn đã xong; đơn chưa xong thì nút bị khóa. Bấm để đơn rời danh sách.
5. Nhắc: sang ngày mới, số thứ tự đánh lại từ 001; đơn nháp không chiếm số.

### Cảnh 9. Ngoại lệ do Chủ quán xử lý: hủy món, hủy hóa đơn, hoàn tiền (UC-15, 23, 24, 13; BR-012) (4 phút)
**Cửa sổ A.** Chuẩn bị: phục vụ gọi một đơn mới ở **bàn 7** gồm 2 món (ví dụ Latte và Brownie); chưa cho pha chế làm.
1. **Hủy món còn Mới:** ở cửa sổ B, bàn 7 → **Hủy món** ở Brownie. Phục vụ hủy được món chưa Đang pha. Nói: bánh hủy ở trạng thái Mới thì cộng lại kho.
2. **Hủy món đang pha:** cửa sổ C bấm **Bắt đầu pha** món Latte rồi để dở. Cửa sổ B không hủy được nữa. Cửa sổ A vào **Bàn** → `/admin/tables/7` → **Hủy món đang pha**, nhập lý do (bắt buộc). Nói: phần nguyên liệu đã trừ **không hoàn lại**, hệ thống tự ghi một phiếu hao hụt lý do "hủy món"; Chủ quán là người xác nhận.
3. **Hóa đơn:** vào **Hóa đơn**, lọc theo **Trạng thái**, **Từ ngày / Đến ngày**, hoặc tìm theo mã, SĐT, tên khách. Mở hóa đơn bàn 3 ở Cảnh 7: **In lại hóa đơn** (bản in có dấu **REPRINT**, hệ thống ghi nhận lần in lại).
4. **Hủy dòng món của đơn mang đi đã thanh toán:** mở hóa đơn của đơn thứ ba (2 dòng) chuẩn bị ở Cảnh 8. Chủ quán bấm **Hủy dòng** ở Brownie, nhập lý do. Hóa đơn không bị sửa; hệ thống ghi một **bản điều chỉnh hoàn tiền một phần** (trạng thái **Chờ Quản lý xác nhận**). Bấm **Hoàn tiền** để xác nhận đã trả tiền cho khách ngoài hệ thống. Nói: mức hoàn tính theo tỷ lệ giá trị dòng, điểm đã dùng hoàn theo tỷ lệ, tiền làm tròn 500đ; chỉ làm được khi ca chưa chốt và dòng còn ở trạng thái Mới; dòng còn lại duy nhất phải dùng **Hủy hóa đơn**.
5. **Hủy hóa đơn:** chọn một hóa đơn trong ca đang mở, bấm **Hủy hóa đơn**, nhập lý do. Hóa đơn chuyển **Đã hủy**, vẫn còn trong danh sách (không xóa), điểm đã dùng được hoàn và điểm đã tích bị thu hồi. Chỉ làm được khi ca chưa chốt và đơn không còn món Đang pha (BR-009).

### Cảnh 10. Kho: hết hàng tự động, nhập kho, kiểm kê, hao hụt, cảnh báo (UC-16 → 21) (4 phút)
**Cửa sổ A** → **Kho**.
1. **Công thức:** mở tab **Công thức**, chọn một món và kích cỡ, chỉ ra nguyên liệu và định lượng (có ly, nắp, topping có công thức riêng). **Lưu công thức** khi sửa.
2. **Hết hàng tự động:** tab **Kiểm kê** → chọn **Sữa tươi**, nhập **Số lượng kiểm kê thực tế** rất thấp (ví dụ `50`), **Lý do điều chỉnh** "Kiểm kê demo", **Xác nhận điều chỉnh**. Sang cửa sổ B, mở một bàn trống ở màn gọi món: các món dùng sữa tươi (ví dụ Latte) chuyển **Hết hàng** và không chọn được. Món hết theo từng cỡ, từng topping. *Cần kiểm tra trước buổi demo món nào đang dùng sữa tươi trong công thức.*
3. **Nhập kho:** tab **Nhập kho** → chọn Sữa tươi, **Số lượng nhập**, **Hạn sử dụng (bắt buộc)** (chỉ sữa tươi và bánh theo dõi hạn), **Thêm vào phiếu** → **Xác nhận phiếu nhập**. Quay lại cửa sổ B: món tự **bán lại** (món do hệ thống tự đặt Hết hàng thì tự mở lại; món do Chủ quán đặt thủ công thì chỉ Chủ quán bật lại).
4. **Hao hụt:** cửa sổ C bấm **Đề xuất hao hụt** (chọn nguyên liệu, số lượng, lý do) → **Gửi đề xuất hao hụt**. Cửa sổ A tab **Hao hụt**: phiếu ở trạng thái đề xuất; bấm **Xác nhận** (kho bị trừ) hoặc **Từ chối**. Nhân viên chỉ đề xuất, Chủ quán xác nhận (BR-016).
5. **Cảnh báo:** tab **Cảnh báo**: **Tồn kho thấp** (Sữa tươi sau kiểm kê), **Sắp hết hạn sử dụng** (trước 2 ngày theo từng phiếu nhập), **Quá hạn**.
6. Nhắc: tồn kho không bao giờ âm; hệ thống chặn trừ vượt số hiện có.

### Cảnh 11. Chốt ca, chốt ngày (UC-31, 32; BR-037) (3 phút)
1. **Cửa sổ D:** tạo nhanh một **đơn nháp chuyển khoản/QR** ở tab **Đơn mang đi** (chưa xác nhận), rồi bấm **Chốt ca**: hệ thống chặn, yêu cầu hủy hoặc xác nhận đơn nháp.
   - Tương tự đơn nháp, **còn đơn mang đi chưa giao khách** cũng chặn chốt ca ("Còn N đơn mang đi chưa giao khách"). Ở tab **Đơn mang đi**, thẻ **Chờ giao khách**, bấm **Đã giao khách** cho từng đơn (đơn pha chế chưa xong thì nút bị khóa) rồi mới chốt được.
2. Xử lý đơn nháp xong (hủy hoặc xác nhận) rồi bấm **Chốt ca**, nhập **Tiền mặt kiểm đếm thực tế (đồng)**. Hệ thống hiện **Doanh thu tiền mặt**, **Tiền mặt dự kiến** (đầu ca + doanh thu tiền mặt, trừ hóa đơn hủy và hoàn tiền một phần), **Tiền thực tế** và **Chênh lệch**. Nhập lệch cố ý (ví dụ thiếu 20.000đ) để thấy chênh lệch được ghi nhận cùng người chốt và thời gian.
3. Sau khi chốt, hóa đơn của ca **không sửa được** (thử Hủy hóa đơn sẽ bị từ chối).
4. **Ca tối là ca chốt ngày.** Nếu chốt ca tối khi còn đơn mở hoặc bàn chưa Trống, hệ thống chặn và **liệt kê từng đơn, từng bàn** cần xử lý (ASM-46). Ca sáng thì bàn giao đơn đang mở sang ca tối (ASM-35).
5. **Cửa sổ A → Nhân sự & ca → Ca & chốt ngày:** Chủ quán thấy **Tiền mặt dự kiến**, có thể **Chốt ca** thay thu ngân (nhập **Tiền mặt kiểm đếm thực tế**), rồi **Chốt ngày kinh doanh** khi không còn đơn mở và mọi bàn Trống. Sau đó dữ liệu ngày đó khóa, không sửa không xóa.

### Cảnh 12. Báo cáo (UC-33, 34) (2 phút)
**Cửa sổ A** → **Báo cáo**.
1. Chọn **Hôm nay**; thử **Hôm qua**, **7 ngày qua**, **Tháng này** và khoảng ngày tự chọn.
2. Chỉ ra: **Tổng doanh thu**, số hóa đơn, số sản phẩm đã bán, biểu đồ **Doanh thu theo ngày**, **món bán chạy**, danh sách hóa đơn theo thứ tự thời gian, bấm một hóa đơn xem chi tiết.
3. Nhấn mạnh quy tắc: **hóa đơn đã hủy không tính**, các khoản hoàn tiền một phần được trừ, doanh thu ghi theo **ngày thanh toán**, không theo ngày tạo đơn.
4. Kết bằng kiến trúc: mọi nghiệp vụ nằm ở backend, thông báo thời gian thực giữa các vai trò, dữ liệu giao dịch không xóa cứng, sao lưu tự động hai lần mỗi ngày (xem [scripts/BACKUP.md](../../scripts/BACKUP.md)).

## 3. Điều hệ thống chưa làm (nói trước để tránh bị hỏi dồn)

Theo mục "Chưa làm" trong [README](../../README.md), các mục sau thuộc nhóm Level 2 hoặc ngoài phạm vi:
- Xuất Excel, Dashboard, báo cáo theo khung giờ, Nhật ký thao tác (Audit Log), cảnh báo đơn chờ pha chế quá 10 phút.
- **Tài khoản dùng chung theo vai trò:** thu ngân, pha chế và phục vụ đăng nhập bằng tài khoản dùng chung của vai trò (điều chỉnh có chủ đích so với yêu cầu gốc, lý do ở README); người trực ca được biết qua chấm công, truy vết sâu hơn do quán tự xử lý (hỏi nhân viên trực ca, xem camera).
- Ngoài phạm vi theo yêu cầu của khách: lương, công nợ nhà cung cấp, đặt bàn trước, tách hóa đơn, gộp bàn, thanh toán một hóa đơn bằng nhiều phương thức, hóa đơn điện tử.

## 4. Xử lý sự cố khi đang demo

| Sự cố | Cách xử lý |
|---|---|
| Trình duyệt báo `ECONNREFUSED` hoặc trang trắng | Backend chưa chạy: `Ctrl+C` rồi `scripts/dev-mysql.sh`, đợi terminal báo xong |
| Báo cổng 8080 hoặc 5173 đang bận | Có bản cũ còn chạy: tắt nó (`lsof -nP -iTCP:8080 -sTCP:LISTEN`, rồi `kill <PID>`) |
| Thu ngân hoặc pha chế bị văng ra màn đăng nhập | Đã 5 phút không thao tác: đăng nhập lại bằng PIN, phiên ca thu ngân vẫn giữ |
| Đăng nhập bị khóa 15 phút | Chủ quán vào **Nhân sự & ca → Nhân viên**, bấm **Mở khóa** |
| Không thanh toán được | Chưa mở ca thu ngân (Cảnh 4), hoặc bàn chưa ở Chờ thanh toán (Cảnh 7 bước 1) |
| Số tiền khác kịch bản | Đang trong khung giờ khuyến mãi (Tea Happy Hour 14:00–16:00, Cake Evening 20:00–21:30) hoặc chương trình "Demo giảm giá" của Cảnh 3 đang bật; đọc số trên màn hình |
| Dữ liệu rối sau nhiều lần thử | Chạy lại `scripts/dev-mysql.sh` để về trạng thái trống |
| Muốn xem ngay đơn mẫu mà không thao tác | `SPRING_FLYWAY_TARGET=latest scripts/dev-mysql.sh` (ca tối đang mở, 3 đơn mẫu, 1 phiếu hao hụt) |

## 5. Lịch trình gợi ý (25 phút)

| Cảnh | Nội dung | Phút |
|---|---|---|
| 1 | Giới thiệu | 1 |
| 2 | Đăng nhập, phân quyền | 2 |
| 3 | Nhân sự, thực đơn, khuyến mãi | 4 |
| 4 | Mở ca | 1 |
| 5 | Phục vụ gọi món | 3 |
| 6 | Pha chế, trừ kho | 3 |
| 7 | Thanh toán đơn tại quán, điểm thành viên | 4 |
| 8 | Đơn mang đi | 3 |
| 9 | Hủy món, hủy hóa đơn, hoàn tiền | 4 |
| 10 | Kho | 4 |
| 11 | Chốt ca, chốt ngày | 3 |
| 12 | Báo cáo | 2 |
| | **Tổng** | **34** |

Tổng 34 phút nếu làm trọn. Để còn 25 phút, rút gọn Cảnh 3 (chỉ làm Thực đơn và Khuyến mãi), làm Cảnh 9 chỉ bước 2 và 4, Cảnh 10 chỉ bước 2 và 3. Phần nào bỏ thì nói trước là đã có sẵn và sẵn sàng chạy nếu được hỏi.
