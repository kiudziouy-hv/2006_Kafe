# 2006 Kafé — Hệ thống quản lý quán cà phê

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

Theo bảng đối chiếu dưới đây, cả **34 use case (UC-01 → UC-34)** của tài liệu đã có API và giao diện:

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

Các quy tắc vận hành (chấm công, nhân viên phụ trách, ca thu ngân, đơn mang đi, ràng buộc nhập liệu) và phần chưa làm xem tại [docs/business-rules.md](docs/business-rules.md).

---

## 2. Công nghệ và ngôn ngữ

| Phần | Ngôn ngữ | Công nghệ | Thư mục |
|---|---|---|---|
| Backend | **Java 21** | Spring Boot 3.3.5, Spring Security (phiên cookie), WebSocket/STOMP, JDBC, Flyway, springdoc (Swagger), Maven | `backend/` |
| Giao diện | **TypeScript** (React 19) | Vite 8, Tailwind CSS 4, React Router, TanStack Query, React Hook Form + Zod, Vitest | `frontend/` |
| Cơ sở dữ liệu | **SQL** (MySQL 8.4) | 29 bảng, 15 trigger, 5 view, thủ tục; dữ liệu mẫu; Flyway sinh từ `database/*.sql` | `database/` |
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

**Kiểm tra máy đã đủ công cụ** (ở thư mục gốc dự án, trong Terminal hoặc Git Bash):
```bash
scripts/check-environment.sh
```
Mỗi công cụ báo `OK` kèm phiên bản, hoặc `THIẾU` nếu chưa cài. Riêng Docker, hãy chắc Docker Desktop **đang chạy** (biểu tượng cá voi không báo lỗi) trước khi sang bước tiếp theo.

### Các bước

> Windows: chạy trong **Git Bash** hoặc **WSL**.

| Bước | Việc |
|---|---|
| 1 | Mở Docker Desktop, đợi khởi động xong |
| 2 | Ở thư mục gốc dự án chạy `scripts/dev-mysql.sh` (nếu báo không có quyền: `chmod +x scripts/dev-mysql.sh`) |
| 3 | Mở http://localhost:5173, đăng nhập bằng tài khoản ở mục 4 |

Script tự tạo MySQL (cổng 3307), chạy backend (8080), giao diện (5173) và nạp dữ liệu mẫu. Dừng: `Ctrl+C`, tắt MySQL: `docker stop vtph-mysql`. Đổi cổng: `SERVER_PORT=8081 scripts/dev-mysql.sh`. Swagger: http://localhost:8080/swagger-ui.html.


### Các lệnh thường dùng

| Việc cần làm | Lệnh (ở thư mục gốc dự án) |
|---|---|
| Kiểm tra máy đã đủ công cụ | `scripts/check-environment.sh` |
| **Chạy hệ thống** (MySQL, backend, giao diện) | `scripts/dev-mysql.sh` rồi mở http://localhost:5173 |
| Dừng backend và giao diện | `Ctrl+C` trong terminal đang chạy |
| Dừng MySQL | `docker stop vtph-mysql` |
| Đặt lại dữ liệu mẫu | chạy lại `scripts/dev-mysql.sh` (tự dựng lại); xóa hẳn: `docker rm -f vtph-mysql && docker volume rm vtph_mysql_data` |
| Chạy test backend | `mvn -f backend/pom.xml test` (**cần Docker đang chạy**: 53/88 test dùng MySQL thật, không có Docker thì các test này báo lỗi chứ không tự bỏ qua) |
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

Nhân viên phải **chấm công vào ca** trước khi đăng nhập (liên kết "Chấm công vào / ra ca" ở màn đăng nhập, đường dẫn `/attendance`). Nhập sai PIN 5 lần bị khóa 15 phút. Thu ngân và Pha chế tự đăng xuất sau 5 phút không thao tác. Chi tiết: [docs/business-rules.md](docs/business-rules.md).

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

### Luồng nghiệp vụ

Chấm công → Thu ngân mở ca → Phục vụ gọi món → Pha chế làm món → Thu ngân thanh toán → chốt ca, Chủ quán chốt ngày → xem báo cáo. Từng bước: [docs/huong-dan-chi-tiet.md](docs/huong-dan-chi-tiet.md) và [kịch bản demo](docs/demo/kich-ban-demo.md).

### Chạy lại để test và demo

Dùng ở thư mục gốc dự án. **Mỗi lần chạy `scripts/dev-mysql.sh`, cơ sở dữ liệu được dựng lại từ đầu**: chỉ có dữ liệu nền, luồng nghiệp vụ (đơn, hóa đơn, ca thu ngân, chấm công) rỗng và tồn kho về mức ban đầu. Không cần xóa gì thủ công.

| Muốn | Làm |
|---|---|
| **Test/demo từ trống** (mặc định) | `Ctrl+C` ở terminal đang chạy, rồi `scripts/dev-mysql.sh`; mở http://localhost:5173 |
| **Giữ dữ liệu lần chạy trước** | `KEEP_DATA=1 scripts/dev-mysql.sh` |
| **Có sẵn đơn mẫu** (ca đang mở, 3 đơn mẫu, 1 phiếu hao hụt để xem ngay; đơn mang đi mẫu chưa giao nên phải giao khách và xử lý đơn nháp trước khi chốt ca) | `SPRING_FLYWAY_TARGET=latest scripts/dev-mysql.sh` |

---

## 5. Hướng dẫn sử dụng nhanh

| Vai trò | Việc thử |
|---|---|
| Nhân viên | Chấm công vào ca ở `/attendance` |
| Phục vụ | Chọn bàn trống → chọn món → **Gửi order**; gọi thêm, chuyển bàn, hủy món |
| Pha chế | **Bắt đầu pha** → **Hoàn thành** |
| Thu ngân | Mở ca → thanh toán đơn tại bàn hoặc đơn mang đi → **Đã giao khách** → chốt ca |
| Chủ quán | Báo cáo, hóa đơn (in lại, hủy, hoàn tiền), kho, thực đơn, nhân sự, chốt ngày |

Dùng mỗi vai trò một cửa sổ ẩn danh để thấy cập nhật thời gian thực.

---

## 6. Chế độ giả lập (không cần MySQL)

Nếu chưa có Docker, vẫn có thể chạy bản rút gọn lưu trong bộ nhớ:

```bash
mvn -f backend/pom.xml spring-boot:run
npm --prefix frontend run dev
```

---

## 7. Kiểm thử

```bash
mvn -f backend/pom.xml test        # test backend (cần Docker đang chạy; 53/88 test dùng MySQL thật, thiếu Docker thì báo lỗi)
npm --prefix frontend run test     # test giao diện
npm --prefix frontend run lint && npm --prefix frontend run typecheck
```
 Chi tiết ở [chiến lược kiểm thử](docs/testing/test-strategy.md).

---

## 8. Cấu trúc thư mục và tài liệu

```
backend/    Spring Boot (API, nghiệp vụ, bảo mật, WebSocket); backend/uploads là ảnh món và topping
frontend/   React (giao diện theo vai trò)
database/   Lược đồ, trigger, view, dữ liệu mẫu MySQL
scripts/    Script chạy, sao lưu, khôi phục, kiểm tra môi trường và đồng bộ migration
docs/       Tài liệu kỹ thuật
```

- Kiến trúc: [tổng quan](docs/architecture/system-overview.md), [quyết định kiến trúc](docs/architecture/architecture-decisions.md), [luồng thời gian thực](docs/architecture/realtime-flow.md)
- Cơ sở dữ liệu: [từ điển dữ liệu](docs/database/data-dictionary.md), [README CSDL](database/README.md)
- API: [quy ước API](docs/api/api-conventions.md), [bảng phân quyền theo từng API](docs/api/api-permissions.md)
- Hướng dẫn chi tiết (cài công cụ, luồng demo từng bước): [docs/huong-dan-chi-tiet.md](docs/huong-dan-chi-tiet.md)
- Phát triển: [cài đặt chi tiết và xử lý sự cố](docs/development/setup.md), [quy ước mã nguồn](docs/development/coding-conventions.md), [quy trình nhóm](docs/development/team-workflow.md), [chiến lược kiểm thử](docs/testing/test-strategy.md)

## 9. Nhóm thực hiện

Nhóm **N15**, môn Phân tích thiết kế và yêu cầu, Trường Đại học Tôn Đức Thắng.

**Người hướng dẫn:** ThS. Phạm Thị Kim Điệp

| Thành viên | MSSV |
|---|---|
| Huỳnh Thị Kiều Vy | 52400040 |
| Hồ Quốc Tiến | 52400164 |
| Võ Tấn Phát | 52400149 |
| Trần Thanh Huy | 52400123 |
