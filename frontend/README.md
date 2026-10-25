# 2006 Kafé — Frontend (bản giao diện, dữ liệu giả)

Giao diện web của hệ thống quản lý quán cà phê **2006 Kafé** (đồ án PTTKYC), dựng theo file Figma
[2006 Kafé UI](https://www.figma.com/design/rSMSQOVVFzblXpB2accLqZ/2006-Kaf%C3%A9-UI?node-id=19-5), trang **05 — UI Screens**.

> ⚠️ **Đây là bản frontend thuần, CHƯA có backend.** Mọi dữ liệu là dữ liệu mẫu nằm trong bộ nhớ trình duyệt,
> **tải lại trang (F5) là dữ liệu quay về ban đầu**. Không có đăng nhập thật, không có cơ sở dữ liệu, không in hóa đơn thật.

## Công nghệ

- React 19 + TypeScript + Vite 6
- Tailwind CSS v4 (design token lấy từ Figma, khai báo trong `src/index.css`)
- React Router 7
- Font Fraunces (Google Fonts)

## Chạy thử

Yêu cầu Node.js 20 trở lên.

```bash
npm install
npm run dev
```

Mở http://localhost:5173. Build bản production: `npm run build` (kết quả trong `dist/`).

## Tài khoản dùng thử

| Vai trò | Cách đăng nhập | Sau khi đăng nhập |
|---|---|---|
| Phục vụ | Tab **Nhân viên** → chọn *Phục vụ* → PIN `111111` | `/phuc-vu` |
| Pha chế | Tab **Nhân viên** → chọn *Pha chế* → PIN `222222` | `/pha-che` |
| Thu ngân | Tab **Nhân viên** → chọn *Thu ngân* → PIN `333333` | `/thu-ngan` |
| Chủ quán / Quản lý | Tab **Quản lý** → `quanly` / `123456` | `/quan-ly/bao-cao` |

- Nhập sai PIN 5 lần liên tiếp sẽ bị khóa 15 phút (BR-042).
- Chấm công (`/cham-cong`): Nhân viên mẫu A/B/C, PIN lần lượt `111111` / `222222` / `333333`.
- Tra cứu thành viên khi thanh toán: số `0912345678` (Khách mẫu, 120 điểm).

## Danh sách màn hình

| Nhóm Figma | Đường dẫn | Màn hình |
|---|---|---|
| A · Đăng nhập & tài khoản | `/dang-nhap`, `/dang-nhap/quan-ly`, `/cham-cong`, `/ho-so`, `/dang-xuat`, `/dang-xuat?ly-do=het-han` | S01–S05, S01-lock, menu tài khoản S03a–c |
| B · Phục vụ (điện thoại 390px) | `/phuc-vu`, `/phuc-vu/ban/:id`, `/phuc-vu/ban/:id/goi-mon`, `/phuc-vu/ban/:id/chuyen-ban` | S10–S15 và các biến thể |
| C · Thu ngân (POS 1280px) | `/thu-ngan`, `/thu-ngan/mang-di`, `/thu-ngan/thanh-toan/:id` (`mang-di` cho đơn mang đi), `/thu-ngan/don-nhap`, `/thu-ngan/chot-ca`, `/thu-ngan/hoa-don` | S20–S29 và các biến thể |
| D · Pha chế (1280px) | `/pha-che` | S30, S30a–d, S31 |
| E · Chủ quán — Bán hàng (1440px) | `/quan-ly/bao-cao`, `/quan-ly/hoa-don`, `/quan-ly/khuyen-mai` | S51, S54–S57 |
| F · Chủ quán — Thực đơn | `/quan-ly/mon`, `/quan-ly/topping` | S42–S44 |
| G · Chủ quán — Kho | `/quan-ly/nguyen-lieu`, `/quan-ly/cong-thuc`, `/quan-ly/nhap-kho`, `/quan-ly/dieu-chinh-ton`, `/quan-ly/hao-hut`, `/quan-ly/canh-bao-kho` | S45–S50 |
| H · Chủ quán — Nhân sự & ca | `/quan-ly/nhan-vien`, `/quan-ly/cham-cong`, `/quan-ly/chot-ngay` | S40, S41, S52, S53 |

Các frame biến thể trong Figma (toast, sidebar thu gọn, nhóm thanh bên đã gập, kết quả tìm kiếm, danh sách trống,
popup/popover) **không** làm thành trang riêng mà là **trạng thái** của trang tương ứng: toast hiện khi thao tác,
nút thu gọn sidebar, bấm tiêu đề nhóm để gập, gõ vào ô tìm kiếm…

## Cấu trúc thư mục

```
src/
  main.tsx              Khai báo route
  index.css             Design token (màu, font, bo góc), hiệu ứng
  store.tsx             Dữ liệu giả + trạng thái dùng chung (bàn, đơn, hóa đơn, kho, hao hụt, khuyến mãi…)
  mock.ts               PIN / tài khoản dùng thử
  usePersist.ts         Giữ dữ liệu giả của từng màn khi chuyển trang
  components/           Thành phần dùng chung theo trang Components của Figma
    ui.tsx              Button, TextField, DateField, Select, Chip, Badge, Modal, ConfirmDialog, chuông thông báo…
    Table.tsx           Bảng, ô tìm kiếm, menu ⋯ của dòng
    Toast.tsx, TopNav.tsx, AccountMenu.tsx, TableCard.tsx, OrderLineCard.tsx, Receipt.tsx, WasteForm.tsx…
  pages/                Màn hình, chia theo vai trò
    waiter/  cashier/  barista/  owner/
  assets/               Ảnh và icon tải từ Figma
```

## Luồng dữ liệu đã nối giữa các màn

- Phục vụ gửi đơn → món hiện bên **Pha chế** → Pha chế bấm *Hoàn thành* → Phục vụ bấm *Khách đã dùng xong* → bàn sang **Chờ thanh toán**.
- Thu ngân thanh toán bàn *Chờ thanh toán* → bàn về **Trống**, hóa đơn xuất hiện ở **Hóa đơn trong ca** và **Hóa đơn** (Chủ quán).
- Thanh toán chuyển khoản/QR → tạo **đơn nháp**; còn đơn nháp thì **không chốt ca** được.
- Nhập kho, điều chỉnh tồn, xác nhận hao hụt → cập nhật **tồn kho** và **Cảnh báo kho**.
- Pha chế gửi đề xuất hao hụt → hiện ở **Phiếu hao hụt** (Chủ quán) chờ xác nhận / từ chối.

Các quy tắc nghiệp vụ trong Figma đã làm: khóa PIN 15 phút (BR-042), điểm tối đa 30% (BR-023), tồn kho không âm (BR-011),
khuyến mãi 1–50%, bắt buộc hạn sử dụng cho sữa tươi/bánh, không sửa chấm công ngày đã chốt, chốt ngày cần chốt hết ca (ASM-48)…

## Lưu ý cho phiên bản hiện tại

- **Chưa có backend / API.** Khi làm backend, thay các hàm trong `src/store.tsx` bằng lời gọi API; giao diện không cần đổi.
- **Logo tạm:** huy hiệu `src/assets/badge.png` (dùng ở màn đăng nhập và ô logo sidebar Chủ quán) và `public/logo.png` (icon tab trình duyệt). Có logo chính thức thì thay 2 file này, giữ nguyên tên.
- **Ảnh món/topping** khi "Tải ảnh lên" chỉ xem trước trên trình duyệt, chưa lưu.
- **In hóa đơn** chỉ hiện bản xem trước 80mm và thông báo, chưa kết nối máy in.
- **Màn Hồ sơ / Đăng xuất (S03, S04)** đang theo kiểu cũ trong Figma (nền be, kính mờ), khác kiểu mới của màn đăng nhập — đúng như Figma hiện tại.
- Tên khu vực bàn trong Figma không thống nhất (S10: *Góc hoài niệm / Hiên nắng*; S10c, S03a: *Trong nhà / Ngoài trời*). Màn Phục vụ theo S10, màn Thu ngân theo S22.
- Hiệu ứng chuyển động nhẹ (popup, toast, drawer, hover) tự tắt khi hệ điều hành bật *giảm chuyển động*.
- Giao diện đã kiểm tra ở 390px (điện thoại), 1280px (POS) và 1440px (quản lý). Các kích thước khác co giãn hợp lý nhưng không có thiết kế riêng trong Figma.
