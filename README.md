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
- **Nhật ký thao tác (Audit Log): không làm.** Hệ thống chỉ có bảng chấm công (mục *Nhân sự & ca*) để biết ai trực ca nào, và các chỉnh sửa chấm công được ghi lại cùng lịch sử. Thao tác ở máy thu ngân và màn hình pha chế dùng tài khoản quầy dùng chung nên không truy được từng người; nếu cần biết ai làm, đối chiếu giờ thao tác với bảng chấm công của ca đó.
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

- **Đăng nhập nhân viên không hiện danh sách tên.** Cả ba vai trò (Thu ngân, Pha chế, Phục vụ) đăng nhập bằng cách chọn vai trò rồi nhập PIN của vai trò đó (tài khoản dùng chung). **Ba PIN phải khác nhau** (`123456`, `234567`, `345678` ở dữ liệu mẫu); nếu hai vai trò dùng chung một PIN thì người này có thể vào tài khoản của vai trò kia và nâng quyền. Mọi thao tác ghi vào tài khoản dùng chung của vai trò, không biết đích danh ai bấm; muốn biết ai trực ca đó thì xem bảng chấm công. Tài khoản dùng chung không dùng để chấm công.
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
| **Thành viên** | Nguyễn Thị Hoa `0912345678` (22 điểm sau đơn mẫu 1: có 24, dùng 10, tích 8) · Trần Quốc Khánh `0987654321` (0 điểm) · Lê Mai Anh `0933222111` (8 điểm) |
| **Kho** | Nguyên liệu kèm định mức tối thiểu, công thức từng món, phiếu nhập kho (cà phê hạt, sữa, đường, trà, syrup, bánh...) |

### Giao dịch mẫu của ngày hôm nay
Hệ thống khởi động với **ngày kinh doanh đang mở**, **một ca thu ngân đang mở** (ca tối, tiền đầu ca 500.000đ, do Hồ Quốc Tiến mở) và ba đơn để xem ngay luồng nghiệp vụ:

| Đơn | Loại | Nội dung | Trạng thái |
|---|---|---|---|
| 1 | Tại quán, bàn 3 | Trà đào cam sả M + trân châu đen, Tiramisu M (giảm 10% Cake Evening). Khách Nguyễn Thị Hoa dùng 10 điểm, tiền mặt | Đã thanh toán **83.500đ**, tích 8 điểm |
| 2 | Mang đi, số 1 | Cà phê sữa L × 2, tiền mặt | Đã thanh toán **78.000đ**, món đang chờ pha chế |
| 3 | Mang đi, chuyển khoản/QR | Trà vải M | **Đơn nháp**, chờ nhận đủ tiền (chưa có hóa đơn, chưa giữ nguyên liệu) |

Ngoài ra có một **phiếu hao hụt** (2 bánh croissant hết hạn) do Pha chế đề xuất, đang chờ Chủ quán xác nhận.

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

Hiện có **67 test backend**, **16 test giao diện** và **35 kịch bản quy tắc CSDL** (`database/run_tests.py`, xem [database/README.md](database/README.md)); tất cả đều đạt. Chi tiết ở [chiến lược kiểm thử](docs/testing/test-strategy.md).

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
