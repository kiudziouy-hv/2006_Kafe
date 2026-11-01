# Yêu cầu

Tài liệu yêu cầu **không sao chép vào đây** để tránh hai bản lệch nhau. Nguồn:

| Tài liệu | Vị trí (trong thư mục đồ án) |
|---|---|
| RAD (use case UC-01..UC-34, business rule BR-xxx, ASM, NFR) | `Final/N15_RAD_v6.docx` |
| Sơ đồ (AD, SD, ST, ERD, DFD) | `Final/Diagram_final.drawio` |
| Giao diện Figma "VTPH Coffee UI" (đang dùng tên 2006 Kafé), bảng màu Mocha v5 | file Figma của nhóm |
| Đặc tả tương tác UI | `UI_GD4_Dac_ta_tuong_tac.md`, `UI_GD1-3_Phan_tich_va_Danh_sach_man_hinh.md` |

## Use case trong mã

Tất cả 34 use case (UC-01..UC-34) đã có API và giao diện. Số UC theo RAD `N15_RAD_v6.docx`:

| UC | Nội dung | Backend | Giao diện |
|---|---|---|---|
| 01, 02 | Đăng nhập, đăng xuất, tự đăng xuất 5 phút | `auth/` | `features/auth` |
| 03, 04 | Thông tin cá nhân; nhân viên và tài khoản | `staff/` | `features/staff` (Hồ sơ, Nhân viên) |
| 05, 06, 27 | Món, topping, khuyến mãi | `menu/`, `promotion/` | `features/menu` |
| 07..11 | Sơ đồ bàn, tạo đơn, gọi thêm, chuyển bàn, chờ thanh toán | `ops/` | `features/tables`, `features/orders` |
| 12, 13 | Đơn mang đi; hủy dòng món đơn mang đi đã thanh toán | `ops/`, `payment/` | `features/payments` (Đơn mang đi), `features/invoices` |
| 14, 15 | Pha chế; hủy món (hao hụt "Hủy món" khi đã Making, BR-012) | `ops/` | `features/kitchen`, `features/orders` |
| 16..21 | Nguyên liệu, công thức, nhập kho, kiểm kê, hao hụt, cảnh báo | `inventory/` | `features/inventory` |
| 22..24 | Thanh toán, in lại, hủy hóa đơn | `ops/`, `payment/` | `features/payments`, `features/invoices` |
| 25, 26 | Đăng ký và tra cứu thành viên | `customer/` | `features/customers` |
| 28, 29 | Chấm công, chỉnh sửa chấm công | `staff/` | `features/staff` (Chấm công, `/attendance`) |
| 30..32 | Mở ca, chốt ca, chốt ngày | `ops/`, `shift/` | `features/payments`, `features/staff` |
| 33, 34 | Báo cáo doanh thu; danh sách hóa đơn | `report/`, `payment/` | `features/reports`, `features/invoices` |

Ngoài phạm vi phiên bản này (Level 2): xuất Excel, dashboard, báo cáo theo khung giờ (FR-M11-007..009).
