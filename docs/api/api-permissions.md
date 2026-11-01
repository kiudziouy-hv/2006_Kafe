# Bảng phân quyền theo từng API

Cập nhật 2026-10-31, lập từ mã nguồn các `*Controller` (89 API) và `WebSocketConfig`.

## Nguyên tắc

- Mọi đường `/api/**` và `/ws/**` bắt buộc đăng nhập, trừ `/api/auth/**` và `/api/health`. Chưa đăng nhập: **401**. Sai vai trò: **403** (`FORBIDDEN`).
- Kiểm tra bằng `Access.who(session, vai trò được phép)` ở backend ([Access.java](../../backend/src/main/java/vn/vtph/coffee/common/Access.java)). **Chủ quán/Quản lý kế thừa mọi quyền**, nên cột Chủ quán luôn có dấu ✓ ở API cần đăng nhập.
- Dấu ✓ ở cột Phục vụ, Pha chế, Thu ngân nghĩa là vai trò đó được gọi API. Ô trống là bị **403**. "công khai" là không cần đăng nhập. `/api/auth/me` chỉ cần có phiên (chưa đăng nhập thì 401).
- Tài khoản bị khóa vĩnh viễn: phiên đang mở mất hiệu lực ngay ở mọi API (401 `ACCOUNT_LOCKED`, BR-042).

## Đăng nhập

| Method | API | Phục vụ | Pha chế | Thu ngân | Chủ quán |
|---|---|:-:|:-:|:-:|:-:|
| GET | `/api/auth/staff` | công khai | công khai | công khai | công khai |
| GET | `/api/auth/on-duty` | công khai | công khai | công khai | công khai |
| POST | `/api/auth/staff/login` | công khai | công khai | công khai | công khai |
| POST | `/api/auth/owner/login` | công khai | công khai | công khai | công khai |
| POST | `/api/auth/logout` | công khai | công khai | công khai | công khai |
| GET | `/api/auth/me` | ✓ | ✓ | ✓ | ✓ |

## Nhân sự và chấm công

| Method | API | Phục vụ | Pha chế | Thu ngân | Chủ quán |
|---|---|:-:|:-:|:-:|:-:|
| POST | `/api/auth/attendance/in` | công khai | công khai | công khai | công khai |
| POST | `/api/auth/attendance/out` | công khai | công khai | công khai | công khai |
| GET | `/api/attendance` |  |  |  | ✓ |
| GET | `/api/attendance/{id}/history` |  |  |  | ✓ |
| PUT | `/api/attendance/{id}` |  |  |  | ✓ |
| POST | `/api/attendance` |  |  |  | ✓ |
| GET | `/api/staff/me` | ✓ | ✓ | ✓ | ✓ |
| PUT | `/api/staff/me` | ✓ | ✓ | ✓ | ✓ |
| GET | `/api/staff` |  |  |  | ✓ |
| POST | `/api/staff` |  |  |  | ✓ |
| PUT | `/api/staff/{id}` |  |  |  | ✓ |
| POST | `/api/staff/{id}/lock` |  |  |  | ✓ |
| POST | `/api/staff/{id}/unlock` |  |  |  | ✓ |
| POST | `/api/staff/{id}/secret` |  |  |  | ✓ |

## Ngày kinh doanh

| Method | API | Phục vụ | Pha chế | Thu ngân | Chủ quán |
|---|---|:-:|:-:|:-:|:-:|
| GET | `/api/shift/day` |  |  |  | ✓ |
| POST | `/api/shift/day/close` |  |  |  | ✓ |

## Bán hàng, pha chế, ca thu ngân

| Method | API | Phục vụ | Pha chế | Thu ngân | Chủ quán |
|---|---|:-:|:-:|:-:|:-:|
| GET | `/api/ops/menu` | ✓ | ✓ | ✓ | ✓ |
| GET | `/api/ops/tables` | ✓ |  | ✓ | ✓ |
| POST | `/api/ops/tables/{no}/orders` | ✓ |  |  | ✓ |
| GET | `/api/ops/tables/{no}/order` | ✓ |  | ✓ | ✓ |
| POST | `/api/ops/orders/{id}/lines/{lid}/cancel` | ✓ |  | ✓ | ✓ |
| POST | `/api/ops/orders/{id}/move` | ✓ |  |  | ✓ |
| POST | `/api/ops/orders/{id}/finish` | ✓ |  |  | ✓ |
| GET | `/api/ops/kitchen` |  | ✓ |  | ✓ |
| POST | `/api/ops/kitchen/{lid}/start` |  | ✓ |  | ✓ |
| POST | `/api/ops/kitchen/{lid}/done` |  | ✓ |  | ✓ |
| GET | `/api/ops/shift` |  |  | ✓ | ✓ |
| POST | `/api/ops/shift/open` |  |  | ✓ | ✓ |
| POST | `/api/ops/shift/close` |  |  | ✓ | ✓ |
| GET | `/api/ops/pending` |  |  | ✓ | ✓ |
| GET | `/api/ops/orders/{id}` | ✓ |  | ✓ | ✓ |
| POST | `/api/ops/orders/{id}/pay` |  |  | ✓ | ✓ |
| POST | `/api/ops/takeaway` |  |  | ✓ | ✓ |
| POST | `/api/ops/takeaway/quote` |  |  | ✓ | ✓ |
| GET | `/api/ops/takeaway/handovers` |  |  | ✓ | ✓ |
| POST | `/api/ops/orders/{id}/handover` |  |  | ✓ | ✓ |
| GET | `/api/ops/drafts` |  |  | ✓ | ✓ |
| POST | `/api/ops/drafts/{id}/confirm` |  |  | ✓ | ✓ |
| POST | `/api/ops/drafts/{id}/requote` |  |  | ✓ | ✓ |
| POST | `/api/ops/drafts/{id}/cancel` |  |  | ✓ | ✓ |

## Thực đơn và topping

| Method | API | Phục vụ | Pha chế | Thu ngân | Chủ quán |
|---|---|:-:|:-:|:-:|:-:|
| GET | `/api/admin/items` |  |  |  | ✓ |
| POST | `/api/admin/items` |  |  |  | ✓ |
| PUT | `/api/admin/items/{id}` |  |  |  | ✓ |
| DELETE | `/api/admin/items/{id}` |  |  |  | ✓ |
| POST | `/api/admin/items/{id}/status` |  |  |  | ✓ |
| POST | `/api/admin/items/{id}/sizes/{size}/status` |  |  |  | ✓ |
| POST | `/api/admin/items/{id}/image` |  |  |  | ✓ |
| GET | `/api/admin/items/{id}/image` |  |  |  | ✓ |
| POST | `/api/admin/toppings/{id}/image` |  |  |  | ✓ |
| GET | `/api/admin/toppings/{id}/image` |  |  |  | ✓ |
| GET | `/api/admin/toppings` |  |  |  | ✓ |
| POST | `/api/admin/toppings` |  |  |  | ✓ |
| PUT | `/api/admin/toppings/{id}` |  |  |  | ✓ |
| POST | `/api/admin/toppings/{id}/status` |  |  |  | ✓ |
| GET | `/api/ops/menu/{id}/image` | ✓ | ✓ | ✓ | ✓ |
| GET | `/api/ops/menu/toppings/{id}/image` | ✓ | ✓ | ✓ | ✓ |

## Khuyến mãi

| Method | API | Phục vụ | Pha chế | Thu ngân | Chủ quán |
|---|---|:-:|:-:|:-:|:-:|
| GET | `/api/promotions` |  |  |  | ✓ |
| POST | `/api/promotions` |  |  |  | ✓ |
| PUT | `/api/promotions/{id}` |  |  |  | ✓ |
| POST | `/api/promotions/{id}/active` |  |  |  | ✓ |

## Kho

| Method | API | Phục vụ | Pha chế | Thu ngân | Chủ quán |
|---|---|:-:|:-:|:-:|:-:|
| GET | `/api/inventory/ingredients` |  | ✓ |  | ✓ |
| POST | `/api/inventory/ingredients` |  |  |  | ✓ |
| PUT | `/api/inventory/ingredients/{id}` |  |  |  | ✓ |
| GET | `/api/inventory/recipes` |  |  |  | ✓ |
| GET | `/api/inventory/recipe` |  |  |  | ✓ |
| PUT | `/api/inventory/recipe` |  |  |  | ✓ |
| GET | `/api/inventory/receipts` |  |  |  | ✓ |
| POST | `/api/inventory/receipts` |  |  |  | ✓ |
| GET | `/api/inventory/adjustments` |  |  |  | ✓ |
| POST | `/api/inventory/adjustments` |  |  |  | ✓ |
| GET | `/api/inventory/waste` |  | ✓ |  | ✓ |
| POST | `/api/inventory/waste` |  | ✓ |  | ✓ |
| POST | `/api/inventory/waste/{id}/confirm` |  |  |  | ✓ |
| POST | `/api/inventory/waste/{id}/reject` |  |  |  | ✓ |
| GET | `/api/inventory/alerts` |  |  |  | ✓ |

## Hóa đơn

| Method | API | Phục vụ | Pha chế | Thu ngân | Chủ quán |
|---|---|:-:|:-:|:-:|:-:|
| GET | `/api/invoices` |  |  | ✓ | ✓ |
| GET | `/api/invoices/{id}` |  |  | ✓ | ✓ |
| POST | `/api/invoices/{id}/reprint` |  |  | ✓ | ✓ |
| POST | `/api/invoices/{id}/cancel` |  |  |  | ✓ |
| POST | `/api/invoices/{id}/lines/{lineId}/cancel` |  |  |  | ✓ |
| POST | `/api/invoices/refunds/{refundId}/confirm` |  |  |  | ✓ |

## Khách hàng

| Method | API | Phục vụ | Pha chế | Thu ngân | Chủ quán |
|---|---|:-:|:-:|:-:|:-:|
| POST | `/api/customers` |  |  | ✓ | ✓ |
| GET | `/api/customers` |  |  | ✓ | ✓ |
| GET | `/api/customers/lookup` |  |  | ✓ | ✓ |

## Báo cáo

| Method | API | Phục vụ | Pha chế | Thu ngân | Chủ quán |
|---|---|:-:|:-:|:-:|:-:|
| GET | `/api/reports/summary` |  |  |  | ✓ |

## Hệ thống

| Method | API | Phục vụ | Pha chế | Thu ngân | Chủ quán |
|---|---|:-:|:-:|:-:|:-:|
| GET | `/api/health` | công khai | công khai | công khai | công khai |

## Kênh thời gian thực (WebSocket `/ws`)

| Kênh | Phục vụ | Pha chế | Thu ngân | Chủ quán |
|---|:-:|:-:|:-:|:-:|
| Pha chế | | ✓ | | ✓ |
| Phục vụ | ✓ | | | ✓ |
| Thu ngân | | | ✓ | ✓ |

## Quy tắc nghiệp vụ đi kèm quyền (ngoài vai trò)

- **Hủy món** `POST /api/ops/orders/{id}/lines/{lid}/cancel`: Phục vụ và Thu ngân chỉ hủy món còn New. Món đang pha (Making) chỉ Chủ quán hủy và bắt buộc ghi lý do. Món Done hoặc đơn đã thanh toán không hủy được ở API này.
- **Hủy hóa đơn, hủy món trên hóa đơn, xác nhận hoàn tiền**: chỉ Chủ quán; hóa đơn thuộc ca đã chốt hoặc đơn còn món Making thì bị chặn.
- **Chốt ca**: Thu ngân hoặc Chủ quán; ca tối chỉ chốt khi không còn đơn nháp, đơn mở và mọi bàn đã Trống.
- **Xóa món** `DELETE /api/admin/items/{id}`: chỉ Chủ quán và chỉ khi món chưa từng có giao dịch.
- **`/api/staff/me`**: nhân viên chỉ xem và sửa hồ sơ của chính mình.
- **Chấm công vào/ra** (`/api/auth/attendance/in|out`) không cần phiên; xác thực bằng tài khoản cá nhân và PIN, sai 5 lần thì khóa 15 phút. Tài khoản quầy dùng chung không chấm công được.

## Điểm cần lưu ý

- `GET /api/auth/staff` công khai và trả danh sách mọi tài khoản nhân viên (id, họ tên, vai trò, cờ khóa, cờ quầy dùng chung; không có Chủ quán). Giao diện không hiển thị danh sách này khi đăng nhập quầy, nhưng ai gọi API cũng đọc được. `GET /api/auth/on-duty?role=CASHIER|WAITER` cũng công khai và chỉ trả mã và tên người đang chấm công của vai trò đó, để chọn tên lúc đăng nhập.
- `GET /api/ops/orders/{id}` cho Phục vụ và Thu ngân xem bất kỳ đơn nào theo mã, không giới hạn theo bàn đang phục vụ.
- Hóa đơn (`GET /api/invoices`, chi tiết, in lại): Thu ngân xem được toàn bộ hóa đơn, không chỉ ca của mình.

## Ngoài phạm vi phân quyền

- **Truy vết ở quầy dùng chung chỉ theo tên được chọn.** Thu ngân và phục vụ chọn tên lúc đăng nhập nên đơn, hóa đơn, ca ghi theo người đó; thu ngân phải nhập PIN riêng của người đã chọn (khóa tạm 5 lần sai tính theo từng người) nên không chọn nhầm được; phục vụ dùng PIN chung nên hệ thống không xác minh được người chọn đúng là mình. Pha chế dùng tài khoản dùng chung, hệ thống không biết người nào thao tác. Quản lý đối chiếu giờ thao tác với bảng chấm công của ca. Truy vết sâu hơn do quán tự xử lý ngoài hệ thống: hỏi nhân viên trực ca và trích camera.
- **Không có nhật ký thao tác (Audit Log)** cho từng API; chỉ chỉnh sửa chấm công có lịch sử.
- **Không bắt đổi PIN lần đầu.** PIN chỉ là lớp bảo vệ đăng nhập, không dùng để xác định người thao tác.
- **Điều chỉnh so với yêu cầu gốc** (mỗi người một tài khoản): xem mục Chưa làm trong [README](../../README.md).
