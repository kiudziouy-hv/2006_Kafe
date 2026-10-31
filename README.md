# 2006 Kafé — Hệ thống quản lý quán cà phê

Tên trong tài liệu RAD: *VTPH Coffee* · Đồ án môn RAD · Nhóm N15 · Trường Đại học Tôn Đức Thắng (TDTU)

Phần mềm giúp một quán cà phê vận hành trọn vòng đời của một ly nước: **phục vụ ghi món → pha chế làm món → thu ngân thanh toán → chủ quán xem báo cáo**, cùng với quản lý thực đơn, kho, nhân sự, thành viên tích điểm và khuyến mãi.

Hệ thống có **bốn vai trò**, dùng trên điện thoại, màn hình quầy bar, máy thu ngân và máy tính; mỗi vai trò có giao diện riêng:

| Vai trò | Thiết bị | Việc chính |
|---|---|---|
| **Phục vụ** | Điện thoại | Xem sơ đồ bàn, gọi món, gọi thêm, chuyển bàn, hủy món |
| **Pha chế** | Màn hình quầy bar | Nhận món theo thời gian thực, bắt đầu làm, hoàn thành, đề xuất hao hụt |
| **Thu ngân** | Máy thu ngân | Mở/chốt ca, thanh toán, đơn mang đi, in hóa đơn |
| **Chủ quán / Quản lý** | Máy tính | Thực đơn, kho, nhân viên, khách hàng, hóa đơn, báo cáo, chốt ngày |

---

## 1. Chức năng

Theo bảng đối chiếu trong [docs/requirements/README.md](docs/requirements/README.md), cả **34 use case (UC-01 → UC-34)** của tài liệu RAD đã có API và giao diện:

| Nhóm | Nội dung |
|---|---|
| Tài khoản | Đăng nhập (Quản lý bằng tên + mật khẩu, nhân viên bằng PIN 6 số), tự đăng xuất, hồ sơ cá nhân |
| Nhân sự | Quản lý nhân viên và tài khoản, chấm công vào/ra, chỉnh sửa chấm công, mở/chốt ca, chốt ngày |
| Thực đơn | Món theo kích cỡ (M/L), topping, ảnh món và topping, khuyến mãi theo nhóm món và khung giờ |
| Bán hàng | Sơ đồ 14 bàn, gọi món, gọi thêm, chuyển bàn, hủy món, đơn mang đi (tiền mặt hoặc chuyển khoản/QR) |
| Pha chế | Bảng món chờ làm cập nhật tức thời, trừ nguyên liệu theo công thức |
| Kho | Nguyên liệu, công thức, nhập kho, kiểm kê, hao hụt, cảnh báo sắp hết/hết hạn |
| Thanh toán | Khuyến mãi → dùng điểm → làm tròn 500đ → tích điểm; in hóa đơn khổ 80 mm |
| Hóa đơn | In lại, hủy, hoàn tiền một phần hoặc toàn bộ (Chủ quán xác nhận) |
| Khách hàng | Đăng ký thành viên, tra cứu bằng số điện thoại, điểm tích lũy |
| Báo cáo | Doanh thu, món bán chạy, danh sách hóa đơn |
| Thông báo | Thông báo thời gian thực giữa các vai trò (WebSocket) |

**Quy tắc tính tiền** (thanh toán một đơn):
1. Trừ khuyến mãi đang áp dụng theo nhóm món và khung giờ.
2. Khách là thành viên có thể dùng điểm: **1 điểm = 1.000đ**, tối đa **30% giá trị đơn sau khuyến mãi**, làm tròn xuống (ví dụ đơn 87.500đ dùng được tối đa 26 điểm).
3. Tổng tiền làm tròn đến **500đ**.
4. Tích điểm cho lần mua này: **cứ 10.000đ được 1 điểm**, tính trên số tiền khách phải trả.

**Chưa làm** (mức mở rộng, Level 2):
- Xuất Excel, dashboard, báo cáo theo khung giờ.
- **Nhật ký thao tác (Audit Log): không làm.** Hệ thống chỉ có bảng chấm công (mục *Nhân sự & ca*) để biết ai trực ca nào, và các chỉnh sửa chấm công được ghi lại cùng lịch sử. Thao tác ở máy thu ngân, màn hình pha chế và điện thoại phục vụ dùng tài khoản dùng chung của vai trò nên không truy được từng người; nếu cần biết ai làm, đối chiếu giờ thao tác với bảng chấm công của ca đó. Việc truy vết sâu hơn do quán tự xử lý ngoài hệ thống: hỏi nhân viên trực ca và trích camera.
- **Bắt đổi PIN lần đầu: không làm.** Nhân viên chỉ nhập PIN của vai trò và tài khoản vẫn dùng chung, nên PIN riêng không xác định được người thao tác; PIN chỉ là lớp bảo vệ đăng nhập.
- **Điều chỉnh so với yêu cầu gốc:** yêu cầu gốc ghi mỗi nhân viên một tài khoản riêng, kể cả khi dùng máy chung, và mỗi thao tác ghi theo tài khoản đang đăng nhập. Nhóm chọn tài khoản dùng chung theo vai trò cho các thiết bị quầy vì giờ cao điểm 1 đến 2 người luân phiên trên cùng một màn hình, đổi tài khoản cho từng thao tác thì không kịp, và phiên tự hết sau 5 phút. Màn hình chỉ thể hiện vai trò (không hiện tên người). Người trực ca được biết qua chấm công bằng tài khoản cá nhân.
- **Cảnh báo đơn chờ pha chế quá 10 phút:** chưa có.

Hoàn tiền không đi qua ngân hàng: Chủ quán trả tiền ngoài hệ thống rồi xác nhận trên hệ thống.

---

## 2. Công nghệ

| Phần | Công nghệ | Thư mục |
|---|---|---|
| Backend | Java 21, Spring Boot 3.3, Spring Security (phiên cookie), WebSocket/STOMP, Flyway, springdoc (Swagger) | `backend/` |
| Giao diện | React 19, TypeScript, Vite, Tailwind 4, React Router, TanStack Query | `frontend/` |
| Cơ sở dữ liệu | MySQL 8.4 (28 bảng, 15 trigger, 5 view, thủ tục) | `database/` |

---

## 3. Chạy hệ thống

### Chuẩn bị công cụ

| Công cụ | Phiên bản | Dùng để |
|---|---|---|
| Java (JDK) | **21** | Chạy backend |
| Maven | 3.9 trở lên | Build và chạy backend |
| Node.js (kèm npm) | **22 trở lên** | Chạy giao diện |
| Docker Desktop | bản mới | Chạy MySQL trong container (không cần cài MySQL lên máy) |
| Git Bash hoặc WSL | chỉ Windows | Chạy được file `.sh` |

**macOS** (dùng [Homebrew](https://brew.sh)):
```bash
brew install openjdk@21 maven node
brew install --cask docker      # sau đó mở ứng dụng Docker một lần để hoàn tất cài đặt
```
Nếu `java -version` chưa báo 21, đặt Java 21 làm mặc định: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`.

**Windows** (PowerShell, dùng `winget`):
```powershell
winget install EclipseAdoptium.Temurin.21.JDK
winget install OpenJS.NodeJS.LTS
winget install Docker.DockerDesktop
winget install Git.Git          # có sẵn Git Bash
```
Maven: tải bản nhị phân tại https://maven.apache.org/download.cgi, giải nén, rồi thêm thư mục `bin` vào biến môi trường `PATH`. Docker Desktop trên Windows cần bật WSL 2 (cài đặt sẽ hướng dẫn). Sau khi cài xong, **mở lại terminal** để nhận `PATH` mới.

**Kiểm tra máy đã đủ công cụ** (ở thư mục gốc dự án, trong Terminal hoặc Git Bash):
```bash
scripts/check-environment.sh
```
Mỗi công cụ báo `OK` kèm phiên bản, hoặc `THIẾU` nếu chưa cài. Riêng Docker, hãy chắc Docker Desktop **đang chạy** (biểu tượng cá voi không báo lỗi) trước khi sang bước tiếp theo.

### Các bước
> **Windows:** chạy `scripts/dev-mysql.sh` trong **Git Bash** hoặc **WSL**. File `scripts/dev-start.bat` chỉ chạy chế độ giả lập (mục 6), không có MySQL.

1. Tải mã nguồn về và mở terminal tại thư mục gốc dự án (thư mục có `README.md` và `backend/`, `frontend/`). Nếu `scripts/dev-mysql.sh` báo không có quyền chạy, thêm quyền một lần: `chmod +x scripts/dev-mysql.sh`.
2. Mở **Docker Desktop** và đợi nó khởi động xong.
3. Ở thư mục gốc dự án, chạy:

   ```bash
   scripts/dev-mysql.sh
   ```

4. Mở trình duyệt tại **http://localhost:5173** và đăng nhập bằng tài khoản ở mục 4.

Script tự làm các việc sau:
- Tạo container MySQL `vtph-mysql` (cổng máy **3307**) từ image `mysql:8.4`.
- Chạy backend ở cổng **8080**. Lần đầu, Flyway tự dựng toàn bộ bảng và nạp **dữ liệu mẫu**, không cần import SQL.
- Chạy giao diện ở cổng **5173**.

Lần chạy đầu cần tải image và thư viện nên sẽ lâu hơn. Các lần sau nhanh hơn nhiều.

**Dừng hệ thống:** nhấn `Ctrl+C` để tắt backend và giao diện. Muốn tắt cả MySQL: `docker stop vtph-mysql`.

**Chỉ chạy một bản.** Nếu terminal báo giao diện ở cổng `5174` thay vì `5173`, nghĩa là đã có một bản khác đang chạy (nó giữ cổng 5173, 8080 và MySQL). Tắt bản cũ trước rồi chạy lại.

**Đổi cổng nếu bị trùng:** `SERVER_PORT=8081 scripts/dev-mysql.sh` (hoặc đặt `DB_PORT`).

**API và Swagger:** http://localhost:8080/swagger-ui.html (đăng nhập trước nếu muốn gọi thử API được bảo vệ).

### Ảnh món và topping
Dự án đã có sẵn ảnh cho 30 món và 5 topping. Chủ quán thêm ảnh ở **Thực đơn** → chế độ xem **Ảnh** → **Thêm ảnh** / **Đổi ảnh** (JPG, PNG hoặc WebP, dưới 5 MB, nên dùng ảnh ngang tỉ lệ 4:3). Ảnh là các tệp trong `backend/uploads/` (`menu/<mã món>.jpg`, `topping/<mã topping>.jpg`), **được commit cùng mã nguồn** nên ai tải dự án về và chạy `scripts/dev-mysql.sh` đều thấy ảnh. Đặt lại CSDL không xóa ảnh. Thêm hoặc đổi ảnh xong thì `git add backend/uploads` rồi commit.

### Dữ liệu có được giữ lại không?
Có. Dữ liệu nằm trong MySQL và được lưu ở Docker volume `vtph_mysql_data`, nên tắt rồi chạy lại vẫn còn những gì bạn đã thêm, sửa, xóa. Vì vậy mỗi lần chạy lại có thể khác nhau nếu trước đó bạn đã thao tác (ví dụ điểm của khách đã bị dùng, ca đã chốt).

**Đặt lại về dữ liệu mẫu ban đầu** (nên làm trước mỗi buổi demo; dừng hệ thống bằng `Ctrl+C` trước):

```bash
docker rm -f vtph-mysql && docker volume rm vtph_mysql_data
scripts/dev-mysql.sh
```

**Lưu ý khi demo:** chốt ngày xong thì hôm đó không mở thêm ca được (cần đặt lại dữ liệu); đừng bấm *Chốt ngày* trước buổi trình bày. Nếu backend báo lỗi `checksum mismatch` của Flyway khi khởi động, nghĩa là CSDL cũ không khớp lược đồ mới, hãy đặt lại dữ liệu như trên.

### Các lệnh thường dùng

| Việc cần làm | Lệnh (ở thư mục gốc dự án) |
|---|---|
| Kiểm tra máy đã đủ công cụ | `scripts/check-environment.sh` |
| **Chạy hệ thống** (MySQL, backend, giao diện) | `scripts/dev-mysql.sh` rồi mở http://localhost:5173 |
| Dừng backend và giao diện | `Ctrl+C` trong terminal đang chạy |
| Dừng MySQL | `docker stop vtph-mysql` |
| Đặt lại dữ liệu mẫu | `docker rm -f vtph-mysql && docker volume rm vtph_mysql_data`, rồi `scripts/dev-mysql.sh` |
| Chạy test backend | `mvn -f backend/pom.xml test` |
| Chạy test giao diện | `npm --prefix frontend run test` |
| Kiểm tra mã giao diện | `npm --prefix frontend run lint && npm --prefix frontend run typecheck` |
| Sau khi sửa `database/*.sql` | `python3 scripts/sync-migrations.py` (kiểm tra không ghi: thêm `--check`) |
| Lưu ảnh món mới vào git | `git add backend/uploads && git commit` |

---

## 4. Tài khoản và dữ liệu mẫu

### Tài khoản đăng nhập

| Vai trò | Họ tên | Cách đăng nhập | Thông tin |
|---|---|---|---|
| Chủ quán / Quản lý | Huỳnh Thị Kiều Vy | Tab **Quản lý** | `owner` / `admin123` |
| Thu ngân | Dùng chung cho máy thu ngân (tài khoản "Quầy Thu ngân") | Tab **Nhân viên** → Thu ngân | PIN `234567`, không chọn tên |
| Phục vụ | Dùng chung cho các điện thoại phục vụ (tài khoản "Điện thoại Phục vụ") | Tab **Nhân viên** → Phục vụ | PIN `123456`, không chọn tên |
| Pha chế | Dùng chung cho màn hình pha chế (tài khoản "Màn hình Pha chế") | Tab **Nhân viên** → Pha chế | PIN `345678`, không chọn tên |

- **Đăng nhập nhân viên không hiện danh sách tên.** Cả ba vai trò đăng nhập bằng cách chọn vai trò rồi nhập PIN của vai trò đó (tài khoản dùng chung). Màn hình chỉ thể hiện vai trò, không thể hiện tên người. **Ba PIN phải khác nhau** (`123456`, `234567`, `345678` ở dữ liệu mẫu); nếu hai vai trò dùng chung một PIN thì người này có thể vào tài khoản của vai trò kia và nâng quyền. Mọi thao tác ghi vào tài khoản dùng chung của vai trò, không biết đích danh ai bấm; muốn biết ai trực ca đó thì xem bảng chấm công. Tài khoản dùng chung không dùng để chấm công.
- **Chấm công** luôn dùng tài khoản cá nhân: ở trang `/attendance`, mỗi người chọn tên và nhập PIN riêng. Các tài khoản quầy dùng chung không xuất hiện ở đó. Tài khoản cá nhân (phục vụ: Võ Tấn Phát, Võ Thị Em, Đỗ Quang Huy; thu ngân: Hồ Quốc Tiến, Lê Hoàng Cường; pha chế: Trần Thanh Huy, Đặng Thị Giang) ở dữ liệu mẫu dùng PIN trùng với PIN của vai trò (`123456`, `234567`, `345678`); khi dùng thật Chủ quán đặt PIN riêng cho từng người.
- Nhập sai PIN 5 lần thì tài khoản bị khóa 15 phút (với quầy dùng chung là khóa cả quầy).
- Thu ngân và Pha chế tự đăng xuất sau 5 phút không thao tác.
- **Chấm công vào/ra ca:** liên kết "Chấm công vào / ra ca" ở màn đăng nhập (đường dẫn `/attendance`).

### Dữ liệu có sẵn

| Loại | Nội dung |
|---|---|
| **Bàn** | 14 bàn: bàn 1–8 trong nhà, bàn 9–14 ngoài trời |
| **Thực đơn** | 30 món chia 4 nhóm: Cà phê (10), Trà (8), Sinh tố (5), Bánh (7). Mỗi món có kích cỡ M (và L với đa số đồ uống) |
| **Giá tham khảo** | Cà phê đen M 29.000đ · Cà phê sữa M 32.000đ · Latte M 45.000đ · Trà đào cam sả M 45.000đ · Tiramisu 45.000đ · Cheesecake 42.000đ |
| **Topping** | Trân châu đen 8.000đ · Thạch dừa 7.000đ · Pudding 8.000đ · Kem cheese 12.000đ · Shot espresso 10.000đ |
| **Khuyến mãi** | **Tea Happy Hour**: giảm 15% nhóm Trà, 14:00–16:00 · **Cake Evening**: giảm 10% nhóm Bánh, 20:00–21:30 |
| **Thành viên** | Nguyễn Thị Hoa `0912345678` (24 điểm) · Trần Quốc Khánh `0987654321` (0 điểm) · Lê Mai Anh `0933222111` (8 điểm) |
| **Kho** | Nguyên liệu kèm định mức tối thiểu, công thức từng món, phiếu nhập kho (cà phê hạt, sữa, đường, trà, syrup, bánh...) |

### Luồng nghiệp vụ bắt đầu từ trống
Mặc định `scripts/dev-mysql.sh` chỉ nạp **dữ liệu nền** ở trên. Hệ thống chưa có đơn, hóa đơn hay ca thu ngân nào, để bạn tự đi hết luồng khi demo. Mỗi bước ghi rõ ai làm, ở màn hình nào, bấm gì. Nên mở sẵn 3 cửa sổ trình duyệt (hoặc 3 thiết bị) cho Phục vụ, Pha chế và Thu ngân để thấy đơn chạy tức thời giữa các vai trò.

**Bước 0. Chấm công (không bắt buộc, dùng khi muốn chứng minh "ai trực ca")**
- Ở màn đăng nhập bấm **Chấm công vào / ra ca** (`/attendance`), chọn tên mình (ví dụ Hồ Quốc Tiến), nhập PIN cá nhân, chọn ca sáng hoặc ca tối.

**Bước 1. Thu ngân mở ca** (`/cashier`)
1. Tab **Nhân viên** → **Thu ngân** → PIN `234567`.
2. Ở khung ca, bấm **Mở ca thu ngân**, nhập **Tiền mặt đầu ca (đồng)** (ví dụ 500000), bấm **Mở ca**.
3. Chưa mở ca thì không thanh toán được; ca tối chỉ mở khi ca sáng đã chốt.

**Bước 2. Phục vụ gọi món tại bàn** (`/service`)
1. Đăng nhập tab **Nhân viên** → **Phục vụ** → PIN `123456` (dùng điện thoại hoặc cửa sổ thu nhỏ).
2. Ở sơ đồ bàn chọn một **bàn trống** (bàn 1–8 trong nhà, 9–14 ngoài trời).
3. Ở mục **Chọn món**, bấm một món; chọn **Kích thước**, **Nóng / lạnh**, **Mức đường**, mức đá, **Topping**, số lượng, rồi bấm **Thêm · giá**. Đồ nóng không có đá; bánh không có tùy chọn.
4. Kiểm tra giỏ **Món đã chọn** rồi bấm **Gửi order**. Đơn xuống màn hình pha chế gần như ngay lập tức.
5. Khách gọi thêm: vào lại bàn đó, chọn món rồi bấm **Gửi thêm món** (cùng một đơn, ghi nhận lượt gửi riêng).
6. Thử thêm: **Chuyển bàn** sang bàn trống khác; hủy một món còn ở trạng thái Mới.

**Bước 3. Pha chế làm món** (`/kitchen`)
1. Đăng nhập tab **Nhân viên** → **Pha chế** → PIN `345678`. Món mới hiện theo thứ tự đến trước làm trước.
2. Bấm **Bắt đầu pha** (Mới → Đang làm): kho tự trừ nguyên liệu theo công thức. Nếu thiếu nguyên liệu, nút đổi thành **Thiếu nguyên liệu** và món/kích cỡ đó chuyển Hết hàng.
3. Làm xong bấm **Hoàn thành**; Phục vụ và Thu ngân nhận thông báo.
4. Bánh được trừ kho ngay khi đơn được gửi, không qua bước pha.

**Bước 4. Phục vụ xác nhận khách dùng xong**
- Khi mọi món đã Hoàn thành (hoặc đã hủy), vào lại bàn và bấm **Khách đã dùng xong**: bàn chuyển sang **Chờ thanh toán**. Nếu khách gọi thêm lúc này, bàn quay lại **Đang phục vụ**.

**Bước 5. Thu ngân thanh toán đơn tại quán** (`/cashier`)
1. Tab **Chờ thanh toán** hiện các bàn đã xong; bấm **Thanh toán** ở bàn cần tính.
2. Nhập **số điện thoại** để nhận diện thành viên (hoặc đăng ký thành viên mới bằng số điện thoại và tên). Dùng điểm nếu muốn (1 điểm = 1.000đ, tối đa 30% đơn sau khuyến mãi).
3. Chọn **tiền mặt** hoặc **chuyển khoản/QR** (nhân viên tự kiểm tra tiền về, hệ thống không nối ngân hàng), bấm **Xác nhận thanh toán**.
4. Hệ thống tính theo thứ tự: giá + topping → khuyến mãi → điểm → làm tròn 500đ → tích điểm (10.000đ = 1 điểm). Thông báo **Thanh toán thành công**, bấm **In hóa đơn** (khổ 80 mm). Bàn về **Trống**.
5. Thử khuyến mãi: **Tea Happy Hour** (giảm 15% trà, 14:00–16:00) và **Cake Evening** (giảm 10% bánh, 20:00–21:30) chỉ áp dụng cho dòng món được gửi trong khung giờ đó.

**Bước 6. Đơn mang đi** (`/cashier`)
1. Tab **Đơn mang đi**; chọn món (chỉ đồ uống lạnh và bánh), số lượng, tùy chọn.
2. **Tiền mặt:** bấm **Thanh toán và gửi pha chế**; đơn nhận số thứ tự trong ngày (001, 002...) và xuống màn hình pha chế ngay.
3. **Chuyển khoản/QR:** đơn là **đơn nháp** (chưa hiện ở pha chế, chưa giữ nguyên liệu, chưa có hóa đơn). Chỉ sau khi thu ngân xác nhận đã nhận đủ tiền thì đơn mới được xác nhận và gửi pha chế; có thể hủy đơn nháp.
4. Pha chế làm món như Bước 3; số thứ tự hiện để gọi khách.

**Bước 7. Chủ quán xử lý ngoại lệ** (`/admin`, tab **Quản lý**: `owner` / `admin123`)
- **Hóa đơn:** xem, in lại (có dấu Reprint), **hủy hóa đơn** kèm lý do (chỉ khi ca chưa chốt và không còn món đang làm), hoàn tiền một phần hoặc toàn bộ rồi xác nhận đã trả tiền.
- **Hủy món đang làm:** chỉ Chủ quán, bắt buộc ghi lý do; phần đã tiêu hao ghi là hao hụt "hủy món".
- **Kho:** xem tồn kho sau khi pha, nhập kho, kiểm kê, xác nhận phiếu hao hụt do Pha chế đề xuất, xem cảnh báo sắp hết hoặc sắp hết hạn.
- **Thực đơn/khuyến mãi/nhân viên/khách hàng:** thêm, sửa, tắt bán, khóa hoặc mở khóa tài khoản.

**Bước 8. Chốt ca và chốt ngày**
1. Thu ngân bấm **Chốt ca**, nhập tiền mặt kiểm đếm thực tế; hệ thống tính tiền dự kiến (tiền đầu ca + tiền mặt thu, trừ hóa đơn hủy và hoàn tiền) và ghi **chênh lệch**. Sau khi chốt, hóa đơn của ca không sửa được. Nếu thu ngân quên, Chủ quán chốt thay.
2. Chủ quán vào **Nhân sự và ca** → tab **Ca & chốt ngày**, bấm **Chốt ngày kinh doanh**. Chỉ chốt được khi không còn đơn mở và mọi bàn đều Trống; ca tối là ca chốt ngày.

**Bước 9. Xem báo cáo** (`/admin`, trang đầu)
- Chọn **Hôm nay**, **Hôm qua**, **7 ngày qua**, **Tháng này** hoặc khoảng ngày tự chọn: tổng doanh thu, số hóa đơn, số sản phẩm đã bán, món bán chạy, danh sách hóa đơn. Hóa đơn đã hủy không tính, hoàn tiền một phần được trừ.

Kịch bản demo đầy đủ từng cảnh, thời lượng và cách xử lý sự cố: [docs/demo/kich-ban-demo.md](docs/demo/kich-ban-demo.md).

### Chạy lại để test và demo

Dùng ở thư mục gốc dự án. **Mỗi lần chạy `scripts/dev-mysql.sh`, cơ sở dữ liệu được dựng lại từ đầu**: chỉ có dữ liệu nền, luồng nghiệp vụ (đơn, hóa đơn, ca thu ngân, chấm công) rỗng và tồn kho về mức ban đầu. Không cần xóa gì thủ công.

| Muốn | Làm |
|---|---|
| **Test/demo từ trống** (mặc định) | `Ctrl+C` ở terminal đang chạy, rồi `scripts/dev-mysql.sh`; mở http://localhost:5173 |
| **Giữ dữ liệu lần chạy trước** | `KEEP_DATA=1 scripts/dev-mysql.sh` |
| **Có sẵn đơn mẫu** (ca tối đang mở, 3 đơn mẫu, 1 phiếu hao hụt để xem ngay) | `SPRING_FLYWAY_TARGET=latest scripts/dev-mysql.sh` |

- Phải tắt bản đang chạy (`Ctrl+C`) trước khi chạy lại, vì bản cũ giữ cổng 8080 và 5173.
- Dữ liệu cũ bị xóa mỗi lần chạy. Cần giữ thì sao lưu trước: `docker exec vtph-mysql mysqldump -uroot -prootpw --single-transaction --routines --triggers VTPH_Coffee | gzip > vtph_truoc_khi_xoa.sql.gz`.
- Chỉ đặt lại dữ liệu trong cơ sở dữ liệu. Ảnh món và topping nằm trong `backend/uploads` nên được giữ nguyên.
- Ngày kinh doanh được tạo theo ngày lúc dựng, nên luôn khớp với hôm chạy.
- Đơn mẫu nằm ở `database/05_seed_transactions.sql`.

---

## 5. Hướng dẫn sử dụng nhanh

Mỗi vai trò dùng một trình duyệt hoặc cửa sổ ẩn danh riêng để thử cùng lúc nhiều vai trò. Khi Phục vụ gửi món, màn hình Pha chế cập nhật ngay.

### Kịch bản gợi ý: một ly nước đi từ đầu đến cuối

1. **Phục vụ** (tab Nhân viên → Phục vụ, chọn tên, PIN `123456`): vào *Sơ đồ bàn*, chọn một bàn trống. Thực đơn nằm bên trái: bấm món, chọn kích cỡ, nóng/lạnh, đường, đá, topping rồi *Thêm*. Món vừa chọn hiện ở khối *Món đã chọn* bên phải (bấm biểu tượng thùng rác để bỏ), bấm *Gửi order* thì chỉ hiện thông báo và món chuyển xuống quầy pha chế.
2. **Pha chế** (chọn vai trò Pha chế, PIN `345678`, không chọn tên): món mới hiện trên bảng, bấm *Bắt đầu pha* (nguyên liệu trong kho được trừ theo công thức; nếu thiếu nguyên liệu nút báo "Thiếu nguyên liệu"), pha xong bấm *Hoàn thành* để báo Phục vụ và Thu ngân.
3. **Thu ngân** (chọn vai trò Thu ngân, PIN `234567`, không chọn tên): chọn bàn đang chờ thanh toán. Nhập số điện thoại thành viên (ví dụ `0912345678`) để dùng điểm, chọn phương thức rồi thanh toán và in hóa đơn.
4. **Chủ quán** (`owner` / `admin123`): xem *Báo cáo* (doanh thu, món bán chạy), *Hóa đơn* (in lại, hủy, hoàn tiền), *Kho* (cảnh báo sắp hết, xác nhận hao hụt). Avatar ở cuối thanh bên mở menu *Thông tin cá nhân* và *Đăng xuất*.
5. Cuối ngày: Thu ngân hoặc Chủ quán **chốt ca**, Chủ quán **chốt ngày**.

### Các thao tác khác nên thử
- **Gọi thêm / chuyển bàn / hủy món:** trên màn hình đơn của một bàn đang phục vụ.
- **Đơn mang đi:** màn Thu ngân, chọn tiền mặt hoặc chuyển khoản/QR (QR sẽ ở dạng đơn nháp đến khi nhận đủ tiền).
- **Thêm món, sửa giá, tạo khuyến mãi:** Chủ quán, mục *Thực đơn*.
- **Nhập kho, kiểm kê:** Chủ quán, mục *Kho*.
- **Thêm nhân viên, đặt lại PIN, xem và sửa chấm công, chốt ca/ngày:** Chủ quán, mục *Nhân sự & ca*.
- **Đăng ký và tra cứu thành viên:** Chủ quán, mục *Thành viên*.
- **Chấm công vào/ra:** trang `/attendance`, mỗi người dùng tài khoản và PIN cá nhân.

---

## 6. Chế độ giả lập (không cần MySQL)

Nếu chưa có Docker, vẫn có thể chạy bản rút gọn lưu trong bộ nhớ:

```bash
mvn -f backend/pom.xml spring-boot:run
npm --prefix frontend run dev
```

Chế độ này chỉ có luồng gọi món → pha chế → thanh toán cơ bản; các màn quản trị (thực đơn, kho, hóa đơn, nhân sự, báo cáo...) không dùng được, và dữ liệu **mất hết** khi tắt backend. Tài khoản: `chuquan` / `Quan@2026`, PIN Phục vụ `123456`, Thu ngân `234567`, Pha chế `345678`.

---

## 7. Kiểm thử

```bash
mvn -f backend/pom.xml test        # test backend (các test MySQL cần Docker, tự bỏ qua nếu không có)
npm --prefix frontend run test     # test giao diện
npm --prefix frontend run lint && npm --prefix frontend run typecheck
```

Hiện có **72 test backend**, **17 test giao diện** và **35 kịch bản quy tắc CSDL** (`database/run_tests.py`, xem [database/README.md](database/README.md)); tất cả đều đạt. Chi tiết ở [chiến lược kiểm thử](docs/testing/test-strategy.md).

---

## 8. Cấu trúc thư mục và tài liệu

```
backend/    Spring Boot (API, nghiệp vụ, bảo mật, WebSocket); backend/uploads là ảnh món và topping
frontend/   React (giao diện theo vai trò)
database/   Lược đồ, trigger, view, dữ liệu mẫu MySQL
scripts/    Script chạy và kiểm tra môi trường
docs/       Tài liệu kỹ thuật
```

- Yêu cầu và use case: [docs/requirements/README.md](docs/requirements/README.md)
- Kiến trúc: [tổng quan](docs/architecture/system-overview.md), [quyết định kiến trúc](docs/architecture/architecture-decisions.md), [luồng thời gian thực](docs/architecture/realtime-flow.md)
- Cơ sở dữ liệu: [từ điển dữ liệu](docs/database/data-dictionary.md), [README CSDL](database/README.md)
- API: [quy ước API](docs/api/api-conventions.md)
- Phát triển: [cài đặt chi tiết và xử lý sự cố](docs/development/setup.md), [quy ước mã nguồn](docs/development/coding-conventions.md), [quy trình nhóm](docs/development/team-workflow.md), [chiến lược kiểm thử](docs/testing/test-strategy.md)
- Refactor backend: [nhật ký](docs/refactor/REFACTOR_LOG.md), [kiến trúc hiện tại](docs/refactor/CURRENT_ARCHITECTURE.md), [nợ kỹ thuật](docs/refactor/TECHNICAL_DEBT.md)

## 9. Nhóm thực hiện

Nhóm **N15**, môn RAD, Trường Đại học Tôn Đức Thắng.

**Người hướng dẫn:** ThS. Phạm Thị Kim Điệp

| Thành viên | MSSV |
|---|---|
| Huỳnh Thị Kiều Vy | 52400040 |
| Hồ Quốc Tiến | 52400164 |
| Võ Tấn Phát | 52400149 |
| Trần Thanh Huy | 52400123 |
