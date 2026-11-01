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
| Tài khoản | Đăng nhập (Quản lý bằng tên + mật khẩu, nhân viên bằng PIN 6 số và phải chấm công trước), tự đăng xuất, hồ sơ cá nhân |
| Nhân sự | Quản lý nhân viên và tài khoản, chấm công vào/ra (kể cả của chính quản lý), chỉnh sửa chấm công, chốt ngày |
| Thực đơn | Món theo kích cỡ (M/L), topping, ảnh món và topping, khuyến mãi theo nhóm món và khung giờ |
| Bán hàng | Sơ đồ 14 bàn, gọi món, gọi thêm, chuyển bàn, hủy món, đơn mang đi (tiền mặt hoặc chuyển khoản/QR, mức "Đá riêng", Thu ngân giao khách khi pha chế xong; chốt ca bị chặn khi còn đơn chưa giao) |
| Pha chế | Bảng món chờ làm cập nhật tức thời, trừ nguyên liệu theo công thức |
| Kho | Nguyên liệu, công thức, nhập kho, kiểm kê, hao hụt, cảnh báo sắp hết/hết hạn |
| Thanh toán | Khuyến mãi → dùng điểm → làm tròn 500đ → tích điểm; Thu ngân chọn nhân viên phụ trách (người đang chấm công) ghi vào hóa đơn; ca hiện thêm doanh thu chuyển khoản để đối chiếu ngân hàng; in hóa đơn khổ 80 mm |
| Hóa đơn | In lại, hủy, hoàn tiền một phần hoặc toàn bộ (Chủ quán xác nhận) |
| Khách hàng | Đăng ký thành viên, tra cứu bằng số điện thoại, điểm tích lũy |
| Báo cáo | Doanh thu, món bán chạy, danh sách hóa đơn |
| Thông báo | Thông báo thời gian thực giữa các vai trò (WebSocket) |

**Quy tắc tính tiền** (thanh toán một đơn):
1. Trừ khuyến mãi đang áp dụng theo nhóm món và khung giờ.
2. Khách là thành viên có thể dùng điểm: **1 điểm = 1.000đ**, tối đa **30% giá trị đơn sau khuyến mãi**, làm tròn xuống (ví dụ đơn 87.500đ dùng được tối đa 26 điểm).
3. Tổng tiền làm tròn đến **500đ**.
4. Tích điểm cho lần mua này: **cứ 10.000đ được 1 điểm**, tính trên số tiền khách phải trả.

**Quy tắc vận hành nổi bật** (đã làm, backend và trigger CSDL thực thi, giao diện chỉ hỗ trợ):
- **Chấm công mới được đăng nhập.** Nhân viên (thu ngân, phục vụ, pha chế) chỉ đăng nhập được khi đã chấm công vào ca: tài khoản cá nhân thì chính người đó đang chấm công; tài khoản quầy dùng chung thì phải có ít nhất một nhân viên cùng vai trò đang chấm công. Chủ quán/Quản lý không bị ràng buộc. Trang `/attendance` luôn mở, và chỉ chặn lúc đăng nhập (phiên đang mở không bị ngắt khi chấm công ra). Chấm công chọn **vai trò rồi tên**, backend từ chối nếu tên không thuộc vai trò đã chọn.
- **Nhân viên phụ trách.** Thu ngân và Phục vụ là người trong ca: lúc đăng nhập các vai trò này, chọn tên trong số người cùng vai trò đang chấm công (cần chấm công trước); phiên đó gửi đơn tại bàn (`created_by`), lập đơn mang đi, xác nhận đơn nháp, thanh toán đơn tại bàn, và tên được lưu vào hóa đơn (`issued_by`), đơn mang đi (`created_by`), hiện trên hóa đơn in. Màn thu tiền không còn ô chọn người.
- **Ca thu ngân.** Mỗi lúc một ca mở; mỗi ca (sáng, tối) chỉ mở một lần trong ngày; ngày đã chốt thì không mở thêm. Tab *Ca thu ngân* hiện hai ô ca sáng và ca tối của hôm nay (kèm tổng ngày) và 7 ngày gần nhất. Mở hoặc chốt ca được báo thời gian thực cho mọi cửa sổ thu ngân và Chủ quán. Hệ thống **không** ràng buộc theo giờ thật nên demo giờ nào cũng mở được ca.
- **Đơn mang đi.** Có mức đá **Đá riêng** (chỉ đơn mang đi). Pha chế xong thì chỉ **Thu ngân** được báo và là người **giao khách** (nút *Đã giao khách* ở thẻ *Chờ giao khách*). **Chốt ca bị chặn** khi còn đơn nháp hoặc còn đơn mang đi chưa giao khách (cả backend lẫn trigger CSDL). Ca hiện thêm doanh thu chuyển khoản/QR để đối chiếu với app ngân hàng; số này không tính vào tiền mặt dự kiến.
- **Thực đơn.** Nhóm *Sinh tố* không có topping; cà phê giữ Kem cheese, Shot espresso, Pudding (Cappuccino và Espresso chỉ Shot espresso).
- **Ràng buộc nhập liệu.** Số điện thoại đúng 10 số bắt đầu bằng 0; tiền không âm, không thập phân, có trần (tiền đầu ca 100 triệu, tiền kiểm đếm và khách đưa 1 tỷ, giá bán và phụ phí 10 triệu); tên tối đa 100 ký tự, email 120, lý do 255; hạn sử dụng nguyên liệu không ở quá khứ và không quá 5 năm; bộ lọc ngày không chọn tương lai, không đảo ngược và tối đa 366 ngày.

**Chưa làm** (mức mở rộng, Level 2):
- Xuất Excel, dashboard, báo cáo theo khung giờ.
- **Nhật ký thao tác (Audit Log): không làm.** Hệ thống chỉ có bảng chấm công (mục *Nhân sự & ca*) để biết ai trực ca nào, và các chỉnh sửa chấm công được ghi lại cùng lịch sử. Thao tác ở máy thu ngân và điện thoại phục vụ ghi theo tên người chọn lúc đăng nhập (đơn, hóa đơn, ca), còn màn hình pha chế dùng tài khoản dùng chung nên không truy được từng người. Các thao tác của pha chế muốn biết ai làm thì đối chiếu giờ thao tác với bảng chấm công của ca đó; việc truy vết sâu hơn do quán tự xử lý ngoài hệ thống: hỏi nhân viên trực ca và trích camera.
- **Bắt đổi PIN lần đầu: không làm.** Nhân viên chỉ nhập PIN của vai trò và tài khoản vẫn dùng chung, nên PIN riêng không xác định được người thao tác; PIN chỉ là lớp bảo vệ đăng nhập.
- **Điều chỉnh so với yêu cầu gốc:** yêu cầu gốc ghi mỗi nhân viên một tài khoản riêng, kể cả khi dùng máy chung, và mỗi thao tác ghi theo tài khoản đang đăng nhập. Nhóm chọn tài khoản dùng chung theo vai trò cho các thiết bị quầy vì giờ cao điểm 1 đến 2 người luân phiên trên cùng một màn hình, đổi tài khoản cho từng thao tác thì không kịp, và phiên tự hết sau 5 phút. Với thu ngân và phục vụ, lúc đăng nhập người dùng chọn thêm tên mình trong số người đang chấm công, nên đơn và hóa đơn vẫn ghi đúng người; pha chế chỉ thể hiện vai trò. Người trực ca được biết qua chấm công bằng tài khoản cá nhân.
- **Cảnh báo đơn chờ pha chế quá 10 phút:** chưa có.

Hoàn tiền không đi qua ngân hàng: Chủ quán trả tiền ngoài hệ thống rồi xác nhận trên hệ thống.

---

## 2. Công nghệ và ngôn ngữ

| Phần | Ngôn ngữ | Công nghệ | Thư mục |
|---|---|---|---|
| Backend | **Java 21** | Spring Boot 3.3.5, Spring Security (phiên cookie), WebSocket/STOMP, JDBC, Flyway, springdoc (Swagger), Maven | `backend/` |
| Giao diện | **TypeScript** (React 19) | Vite 8, Tailwind CSS 4, React Router, TanStack Query, React Hook Form + Zod, Vitest | `frontend/` |
| Cơ sở dữ liệu | **SQL** (MySQL 8.4) | 28 bảng, 15 trigger, 5 view, thủ tục; dữ liệu mẫu; Flyway sinh từ `database/*.sql` | `database/` |
| Công cụ | **Python 3**, **shell** (Bash), batch (Windows) | `run_tests.py` (36 kịch bản CSDL), `sync-migrations.py`, `dev-mysql.sh`, sao lưu và khôi phục | `scripts/`, `database/` |
| Cấu hình, tài liệu | JSON, properties, YAML, Markdown, Makefile | CI GitHub Actions, `docs/` | `.github/`, `docs/` |

Backend và giao diện trao đổi bằng REST và WebSocket, dữ liệu JSON. **Ngôn ngữ hiển thị của hệ thống là tiếng Việt** (giao diện, thông báo lỗi của backend, tài liệu); tên biến, hàm và bảng dùng tiếng Anh, chú thích trong code viết tiếng Việt. Mọi quy tắc nghiệp vụ quan trọng nằm ở backend và trigger CSDL; giao diện chỉ hiển thị và kiểm tra nhập liệu cho dễ dùng.

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
**Mặc định là không.** Mỗi lần chạy `scripts/dev-mysql.sh`, cơ sở dữ liệu được dựng lại từ đầu: chỉ có dữ liệu nền (thực đơn, kho, nhân viên, bàn, khách mẫu), còn đơn, hóa đơn, ca thu ngân và chấm công **rỗng**, tồn kho về mức ban đầu. Nhờ đó lần nào cũng demo được từ trống. Chi tiết và các tùy chọn ở mục 4, phần *Chạy lại để test và demo*.

- Muốn **giữ dữ liệu** lần chạy trước: `KEEP_DATA=1 scripts/dev-mysql.sh`.
- Muốn **xóa hẳn** container và volume (ví dụ sau khi đổi lược đồ lớn): `docker rm -f vtph-mysql && docker volume rm vtph_mysql_data`, rồi `scripts/dev-mysql.sh`.

**Lưu ý khi demo:** chốt ngày xong thì hôm đó không mở thêm ca được (chạy lại script để dựng lại dữ liệu); đừng bấm *Chốt ngày* trước buổi trình bày. Nếu backend báo lỗi `checksum mismatch` của Flyway khi khởi động, nghĩa là CSDL cũ không khớp lược đồ mới, hãy xóa hẳn container và volume như trên. Nhớ **chấm công trước** khi đăng nhập các vai trò (mục 4).

### Các lệnh thường dùng

| Việc cần làm | Lệnh (ở thư mục gốc dự án) |
|---|---|
| Kiểm tra máy đã đủ công cụ | `scripts/check-environment.sh` |
| **Chạy hệ thống** (MySQL, backend, giao diện) | `scripts/dev-mysql.sh` rồi mở http://localhost:5173 |
| Dừng backend và giao diện | `Ctrl+C` trong terminal đang chạy |
| Dừng MySQL | `docker stop vtph-mysql` |
| Đặt lại dữ liệu mẫu | chạy lại `scripts/dev-mysql.sh` (tự dựng lại); xóa hẳn: `docker rm -f vtph-mysql && docker volume rm vtph_mysql_data` |
| Chạy test backend | `mvn -f backend/pom.xml test` (test MySQL cần Docker đang chạy) |
| Chạy test giao diện | `npm --prefix frontend run test` |
| Kiểm tra mã giao diện | `npm --prefix frontend run lint && npm --prefix frontend run typecheck` |
| Sau khi sửa `database/*.sql` | `python3 scripts/sync-migrations.py` (kiểm tra không ghi: thêm `--check`) |
| Chạy 36 kịch bản quy tắc CSDL | `MYSQL_PWD='<mật khẩu>' python3 database/run_tests.py` (xem [database/README.md](database/README.md)) |
| Lưu ảnh món mới vào git | `git add backend/uploads && git commit` |

---

## 4. Tài khoản và dữ liệu mẫu

### Tài khoản đăng nhập

| Vai trò | Họ tên | Cách đăng nhập | Thông tin |
|---|---|---|---|
| Chủ quán / Quản lý | Huỳnh Thị Kiều Vy | Tab **Quản lý** | `owner` / `admin123` |
| Thu ngân | Dùng chung cho máy thu ngân (tài khoản "Quầy Thu ngân") | Tab **Nhân viên** → Thu ngân | chọn tên rồi nhập **PIN riêng**: Hồ Quốc Tiến `234567`, Lê Hoàng Cường `456789` |
| Phục vụ | Dùng chung cho các điện thoại phục vụ (tài khoản "Điện thoại Phục vụ") | Tab **Nhân viên** → Phục vụ | PIN `123456`, không chọn tên |
| Pha chế | Dùng chung cho màn hình pha chế (tài khoản "Màn hình Pha chế") | Tab **Nhân viên** → Pha chế | PIN `345678`, không chọn tên |

- **Đăng nhập nhân viên không hiện danh sách tài khoản.** Cả ba vai trò đăng nhập bằng cách chọn vai trò rồi nhập PIN của vai trò đó (tài khoản dùng chung). Riêng Thu ngân và Phục vụ còn chọn tên mình trong số người cùng vai trò đang chấm công; Pha chế chỉ thể hiện vai trò. **Thu ngân nhập PIN riêng của chính người đã chọn** (quán có hai thu ngân theo ca sáng và ca tối: *Hồ Quốc Tiến*, *Lê Hoàng Cường*), nên chọn tên người khác thì không vào được; Chủ quán đặt hoặc đổi PIN từng người ở màn Nhân viên. **PIN của các vai trò phải khác nhau** (phục vụ `123456`, pha chế `345678`, thu ngân Hồ Quốc Tiến `234567` và Lê Hoàng Cường `456789` ở dữ liệu mẫu); nếu hai vai trò dùng chung một PIN thì người này có thể vào tài khoản của vai trò kia và nâng quyền. Thao tác của Thu ngân và Phục vụ ghi theo người đã chọn lúc đăng nhập (thu ngân có PIN riêng nên không chọn nhầm được; phục vụ dùng PIN chung nên chỉ là tên chọn); thao tác của Pha chế ghi vào tài khoản dùng chung, muốn biết ai trực ca đó thì xem bảng chấm công. Tài khoản dùng chung không dùng để chấm công.
- **Chấm công** luôn dùng tài khoản cá nhân: ở trang `/attendance`, mỗi người chọn **vai trò** (Thu ngân, Phục vụ, Pha chế), rồi chọn **tên** trong danh sách của vai trò đó và nhập PIN. Backend từ chối nếu tên không thuộc vai trò đã chọn (`WRONG_ROLE`). PIN ở dữ liệu mẫu **theo vai trò**, đồng bộ với đăng nhập: thu ngân `234567`, phục vụ `123456`, pha chế `345678`. Tài khoản cá nhân: phục vụ Võ Tấn Phát, Võ Thị Em, Đỗ Quang Huy; thu ngân Hồ Quốc Tiến, Lê Hoàng Cường; pha chế Trần Thanh Huy, Đặng Thị Giang. Các tài khoản quầy dùng chung không xuất hiện ở trang chấm công. Khi dùng thật, Chủ quán đặt PIN riêng cho từng người ở **Nhân sự & ca → Nhân viên**.
- **Phải chấm công trước khi đăng nhập** (thu ngân, phục vụ, pha chế): tài khoản cá nhân thì chính người đó đang chấm công; quầy dùng chung thì phải có ít nhất một nhân viên cùng vai trò đang chấm công. Với dữ liệu mẫu mới dựng lại thì chưa ai chấm công, nên việc đầu tiên là vào `/attendance`. Chủ quán không bị ràng buộc.
- **Ràng buộc nhập liệu:** số điện thoại đúng 10 số bắt đầu bằng 0; tiền không âm, không thập phân, có trần (tiền đầu ca 100 triệu, tiền kiểm đếm/khách đưa 1 tỷ, giá bán và phụ phí 10 triệu); tên tối đa 100 ký tự; hạn sử dụng nguyên liệu không ở quá khứ và không quá 5 năm; bộ lọc ngày không chọn tương lai, không đảo ngược, tối đa 366 ngày.
- Nhập sai PIN 5 lần thì tài khoản bị khóa 15 phút (với quầy dùng chung là khóa cả quầy).
- Thu ngân và Pha chế tự đăng xuất sau 5 phút không thao tác.
- **Chấm công vào/ra ca:** liên kết "Chấm công vào / ra ca" ở màn đăng nhập (đường dẫn `/attendance`), cùng khung giao diện với màn đăng nhập và tự thu nhỏ cho vừa màn hình ở mọi kích thước.

### Dữ liệu có sẵn

| Loại | Nội dung |
|---|---|
| **Bàn** | 14 bàn: bàn 1–8 trong nhà, bàn 9–14 ngoài trời |
| **Thực đơn** | 30 món chia 4 nhóm: Cà phê (10), Trà (8), Sinh tố (5, không có topping), Bánh (7). Mỗi món có kích cỡ M (và L với đa số đồ uống) |
| **Giá tham khảo** | Cà phê đen M 29.000đ · Cà phê sữa M 32.000đ · Latte M 45.000đ · Trà đào cam sả M 45.000đ · Tiramisu 45.000đ · Cheesecake 42.000đ |
| **Topping** | Trân châu đen 8.000đ · Thạch dừa 7.000đ · Pudding 8.000đ · Kem cheese 12.000đ · Shot espresso 10.000đ (trà dùng trân châu, thạch dừa, pudding; cà phê dùng kem cheese, shot espresso, pudding) |
| **Khuyến mãi** | **Tea Happy Hour**: giảm 15% nhóm Trà, 14:00–16:00 · **Cake Evening**: giảm 10% nhóm Bánh, 20:00–21:30 |
| **Thành viên** | Nguyễn Thị Hoa `0912345678` (24 điểm) · Trần Quốc Khánh `0987654321` (0 điểm) · Lê Mai Anh `0933222111` (8 điểm) |
| **Kho** | Nguyên liệu kèm định mức tối thiểu, công thức từng món, phiếu nhập kho (cà phê hạt, sữa, đường, trà, syrup, bánh...) |

### Luồng nghiệp vụ bắt đầu từ trống
Mặc định `scripts/dev-mysql.sh` chỉ nạp **dữ liệu nền** ở trên. Hệ thống chưa có đơn, hóa đơn hay ca thu ngân nào, để bạn tự đi hết luồng khi demo. Mỗi bước ghi rõ ai làm, ở màn hình nào, bấm gì. Nên mở sẵn 3 cửa sổ trình duyệt (hoặc 3 thiết bị) cho Phục vụ, Pha chế và Thu ngân để thấy đơn chạy tức thời giữa các vai trò.

**Bước 0. Chấm công (bắt buộc trước khi đăng nhập nhân viên)**
- Ở màn đăng nhập bấm **Chấm công vào / ra ca** (`/attendance`), bấm tab **Chấm công vào**, chọn **vai trò** (ví dụ Thu ngân), chọn **tên** (ví dụ Hồ Quốc Tiến), chọn ca sáng hoặc ca tối, nhập PIN (thu ngân: Hồ Quốc Tiến `234567`, Lê Hoàng Cường `456789`) rồi bấm OK. Làm tương tự cho một phục vụ (`123456`) và một pha chế (`345678`). Chưa ai chấm công thì đăng nhập vai trò đó bị chặn.

**Bước 1. Thu ngân mở ca** (`/cashier`)
1. Tab **Nhân viên** → **Thu ngân** → chọn tên (người đã chấm công) → PIN riêng (Hồ Quốc Tiến `234567`).
2. Vào tab **Ca thu ngân**: ô **Ca sáng** hoặc **Ca tối** chưa mở có sẵn form; nhập **Tiền mặt đầu ca (đồng)** (ví dụ 500000), bấm **Mở ca**. Ở tab **Chờ thanh toán** hoặc **Đơn mang đi** khi chưa mở ca, nút **Mở ca thu ngân** mở popup mở ca ngay tại chỗ.
3. Chưa mở ca thì không thanh toán và không tạo đơn mang đi được; mỗi lúc chỉ một ca mở, ca tối mở sau khi chốt ca sáng. Mở ca xong, mọi cửa sổ thu ngân tự cập nhật.

**Bước 2. Phục vụ gọi món tại bàn** (`/service`)
1. Đăng nhập tab **Nhân viên** → **Phục vụ** → PIN `123456` (dùng điện thoại hoặc cửa sổ thu nhỏ).
2. Ở sơ đồ bàn chọn một **bàn trống** (bàn 1–8 trong nhà, 9–14 ngoài trời).
3. Ở mục **Chọn món**, bấm một món; chọn **Kích thước**, **Nóng / lạnh**, **Mức đường**, mức đá, **Topping**, số lượng, rồi bấm **Thêm · giá**. Đồ nóng không có đá; bánh không có tùy chọn; sinh tố không có topping.
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
2. Nhập **số điện thoại** (đúng 10 số) để nhận diện thành viên (hoặc đăng ký thành viên mới bằng số điện thoại và tên). Dùng điểm nếu muốn (1 điểm = 1.000đ, tối đa 30% đơn sau khuyến mãi).
3. Chọn **tiền mặt** hoặc **chuyển khoản/QR** (nhân viên tự kiểm tra tiền về, hệ thống không nối ngân hàng), bấm **Xác nhận thanh toán**.
4. Hệ thống tính theo thứ tự: giá + topping → khuyến mãi → điểm → làm tròn 500đ → tích điểm (10.000đ = 1 điểm). Thông báo **Thanh toán thành công**, bấm **In hóa đơn** (khổ 80 mm). Bàn về **Trống**.
5. Thử khuyến mãi: **Tea Happy Hour** (giảm 15% trà, 14:00–16:00) và **Cake Evening** (giảm 10% bánh, 20:00–21:30) chỉ áp dụng cho dòng món được gửi trong khung giờ đó.

**Bước 6. Đơn mang đi** (`/cashier`)
1. Tab **Đơn mang đi**; chọn món (chỉ đồ uống lạnh và bánh), số lượng, tùy chọn (mức đá có thêm **Đá riêng**). Chọn thành viên (nếu có, dùng được cho cả tiền mặt lẫn chuyển khoản).
2. **Tiền mặt:** bấm **Thanh toán và gửi pha chế**; đơn nhận số thứ tự trong ngày (001, 002...) và xuống màn hình pha chế ngay.
3. **Chuyển khoản/QR:** đơn là **đơn nháp** (chưa hiện ở pha chế, chưa giữ nguyên liệu, chưa có hóa đơn). Chỉ sau khi thu ngân xác nhận đã nhận đủ tiền thì đơn mới được xác nhận và gửi pha chế; có thể hủy đơn nháp.
4. Pha chế làm món như Bước 3; số thứ tự hiện để gọi khách.
5. **Giao khách:** pha chế xong thì chỉ **Thu ngân** nhận thông báo "#001 xong, gọi khách nhận". Ở thẻ **Chờ giao khách**, bấm **Đã giao khách** (nút khóa nếu pha chế chưa xong). Còn đơn nháp hoặc đơn chưa giao thì không chốt ca được.

**Bước 7. Chủ quán xử lý ngoại lệ** (`/admin`, tab **Quản lý**: `owner` / `admin123`)
- **Hóa đơn:** xem, in lại (có dấu Reprint), **hủy hóa đơn** kèm lý do (chỉ khi ca chưa chốt và không còn món đang làm), hoàn tiền một phần hoặc toàn bộ rồi xác nhận đã trả tiền.
- **Hủy món đang làm:** chỉ Chủ quán, bắt buộc ghi lý do; phần đã tiêu hao ghi là hao hụt "hủy món".
- **Kho:** xem tồn kho sau khi pha, nhập kho, kiểm kê, xác nhận phiếu hao hụt do Pha chế đề xuất, xem cảnh báo sắp hết hoặc sắp hết hạn.
- **Thực đơn/khuyến mãi/nhân viên/khách hàng:** thêm, sửa, tắt bán, khóa hoặc mở khóa tài khoản.

**Bước 8. Chốt ca và chốt ngày**
1. Thu ngân bấm **Chốt ca** ở ô ca đang mở, nhập tiền mặt kiểm đếm thực tế; hệ thống tính tiền dự kiến (tiền đầu ca + tiền mặt thu, trừ hóa đơn hủy và hoàn tiền) và ghi **chênh lệch**. Doanh thu chuyển khoản/QR hiện riêng để đối chiếu ngân hàng. Chốt bị chặn khi còn đơn nháp hoặc đơn mang đi chưa giao. Sau khi chốt, hóa đơn của ca không sửa được; ô ca chuyển sang **Đã chốt** kèm nhãn Khớp tiền hoặc số tiền lệch.
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
| **Có sẵn đơn mẫu** (ca đang mở, 3 đơn mẫu, 1 phiếu hao hụt để xem ngay; đơn mang đi mẫu chưa giao nên phải giao khách và xử lý đơn nháp trước khi chốt ca) | `SPRING_FLYWAY_TARGET=latest scripts/dev-mysql.sh` |

- Phải tắt bản đang chạy (`Ctrl+C`) trước khi chạy lại, vì bản cũ giữ cổng 8080 và 5173.
- Dữ liệu cũ bị xóa mỗi lần chạy. Cần giữ thì sao lưu trước: `docker exec vtph-mysql mysqldump -uroot -prootpw --single-transaction --routines --triggers VTPH_Coffee | gzip > vtph_truoc_khi_xoa.sql.gz`.
- Chỉ đặt lại dữ liệu trong cơ sở dữ liệu. Ảnh món và topping nằm trong `backend/uploads` nên được giữ nguyên.
- Ngày kinh doanh được tạo theo ngày lúc dựng, nên luôn khớp với hôm chạy.
- Đơn mẫu nằm ở `database/05_seed_transactions.sql`.

---

## 5. Hướng dẫn sử dụng nhanh

Mỗi vai trò dùng một trình duyệt hoặc cửa sổ ẩn danh riêng để thử cùng lúc nhiều vai trò. Khi Phục vụ gửi món, màn hình Pha chế cập nhật ngay.

### Kịch bản gợi ý: một ly nước đi từ đầu đến cuối

0. **Chấm công trước** (`/attendance`): chọn vai trò, chọn tên, nhập PIN, cho ít nhất một thu ngân, một phục vụ và một pha chế. Không có bước này thì không đăng nhập được các vai trò nhân viên.
1. **Phục vụ** (tab Nhân viên → Phục vụ, PIN `123456`, không chọn tên): vào *Sơ đồ bàn*, chọn một bàn trống. Thực đơn nằm bên trái: bấm món, chọn kích cỡ, nóng/lạnh, đường, đá, topping rồi *Thêm*. Món vừa chọn hiện ở khối *Món đã chọn* bên phải (bấm biểu tượng thùng rác để bỏ), bấm *Gửi order* thì chỉ hiện thông báo và món chuyển xuống quầy pha chế.
2. **Pha chế** (chọn vai trò Pha chế, PIN `345678`, không chọn tên): món mới hiện trên bảng, bấm *Bắt đầu pha* (nguyên liệu trong kho được trừ theo công thức; nếu thiếu nguyên liệu nút báo "Thiếu nguyên liệu"), pha xong bấm *Hoàn thành* để báo Phục vụ và Thu ngân.
3. **Thu ngân** (chọn vai trò Thu ngân, chọn tên, nhập PIN riêng của người đó, ví dụ Hồ Quốc Tiến `234567`): chọn bàn đang chờ thanh toán. Nhập số điện thoại thành viên (ví dụ `0912345678`) để dùng điểm, chọn phương thức rồi thanh toán và in hóa đơn.
4. **Chủ quán** (`owner` / `admin123`): xem *Báo cáo* (doanh thu, món bán chạy), *Hóa đơn* (in lại, hủy, hoàn tiền), *Kho* (cảnh báo sắp hết, xác nhận hao hụt). Avatar ở cuối thanh bên mở menu *Thông tin cá nhân* và *Đăng xuất*.
5. Cuối ngày: Thu ngân **chốt ca**, Chủ quán **chốt ngày**.

### Các thao tác khác nên thử
- **Gọi thêm / chuyển bàn / hủy món:** trên màn hình đơn của một bàn đang phục vụ.
- **Đơn mang đi:** màn Thu ngân, chọn tiền mặt hoặc chuyển khoản/QR (QR sẽ ở dạng đơn nháp đến khi nhận đủ tiền); pha chế xong thì Thu ngân bấm *Đã giao khách*.
- **Ca thu ngân:** xem hai ô ca sáng, ca tối của hôm nay và 7 ngày gần nhất; mở hai cửa sổ thu ngân để thấy mở/chốt ca cập nhật ngay.
- **Thêm món, sửa giá, tạo khuyến mãi:** Chủ quán, mục *Thực đơn*.
- **Nhập kho, kiểm kê:** Chủ quán, mục *Kho*.
- **Thêm nhân viên, đặt lại PIN, xem và sửa chấm công, chốt ca/ngày:** Chủ quán, mục *Nhân sự & ca*.
- **Đăng ký và tra cứu thành viên:** Chủ quán, mục *Thành viên*.
- **Chấm công vào/ra:** trang `/attendance`, mỗi người chọn vai trò, tên và dùng PIN cá nhân.

---

## 6. Chế độ giả lập (không cần MySQL)

Nếu chưa có Docker, vẫn có thể chạy bản rút gọn lưu trong bộ nhớ:

```bash
mvn -f backend/pom.xml spring-boot:run
npm --prefix frontend run dev
```

Chế độ này chỉ có luồng gọi món → pha chế → thanh toán cơ bản; các màn quản trị (thực đơn, kho, hóa đơn, nhân sự, báo cáo...) không dùng được, và dữ liệu **mất hết** khi tắt backend. Tài khoản: `chuquan` / `Quan@2026`, PIN Phục vụ `123456`, Thu ngân `234567`, Pha chế `345678`. Chế độ này không có chấm công và không có CSDL nên **không áp dụng** ràng buộc chấm công mới được đăng nhập, nhân viên phụ trách và các trigger.

---

## 7. Kiểm thử

```bash
mvn -f backend/pom.xml test        # test backend (các test MySQL cần Docker, tự bỏ qua nếu không có)
npm --prefix frontend run test     # test giao diện
npm --prefix frontend run lint && npm --prefix frontend run typecheck
```

Hiện có **87 test backend** (gồm test chạy trên MySQL thật), **20 test giao diện** và **36 kịch bản quy tắc CSDL** (`database/run_tests.py`, xem [database/README.md](database/README.md)); tất cả đều đạt. Chi tiết ở [chiến lược kiểm thử](docs/testing/test-strategy.md).

---

## 8. Cấu trúc thư mục và tài liệu

```
backend/    Spring Boot (API, nghiệp vụ, bảo mật, WebSocket); backend/uploads là ảnh món và topping
frontend/   React (giao diện theo vai trò)
database/   Lược đồ, trigger, view, dữ liệu mẫu MySQL
scripts/    Script chạy, sao lưu, khôi phục, kiểm tra môi trường và đồng bộ migration
docs/       Tài liệu kỹ thuật
```

- Yêu cầu và use case: [docs/requirements/README.md](docs/requirements/README.md)
- Kiến trúc: [tổng quan](docs/architecture/system-overview.md), [quyết định kiến trúc](docs/architecture/architecture-decisions.md), [luồng thời gian thực](docs/architecture/realtime-flow.md)
- Cơ sở dữ liệu: [từ điển dữ liệu](docs/database/data-dictionary.md), [README CSDL](database/README.md)
- API: [quy ước API](docs/api/api-conventions.md), [bảng phân quyền theo từng API](docs/api/api-permissions.md)
- Demo: [kịch bản demo](docs/demo/kich-ban-demo.md)
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
