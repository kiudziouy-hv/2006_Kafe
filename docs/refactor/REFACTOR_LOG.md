# Nhật ký refactor backend

Nhánh: `refactor/backend`. Không commit/push tự động; các thay đổi nằm trong working tree. Không đổi lược đồ, dữ liệu, migration, API, quyền, cookie, WebSocket.

## Bước 0 — Baseline (2026-10-26)

| Hạng mục | Kết quả |
|---|---|
| Git | `main` có 1 commit (`e35d3a4`); tạo nhánh `refactor/backend` từ đó. Working tree có 18 thay đổi chưa commit từ trước (chủ yếu `frontend/` và 4 tài liệu khảo sát); đã giữ nguyên, không stash, không commit |
| Build/test (trước khi sửa) | `mvn -B test`: **50 chạy, 0 lỗi, 0 bỏ qua**, `BUILD SUCCESS` (Docker + MySQL 8.4 Testcontainers chạy được) |
| Test tích hợp | Cần Docker; nếu không có thì lớp `AbstractMySqlIT` tự bỏ qua (`@EnabledIf`), nên "pass" khi không có Docker không có nghĩa là đã kiểm tra MySQL |

## Bước 1 — Gom quy tắc tính giá/điểm vào `PricingPolicy`

### Quy tắc hiện hữu (quan sát từ mã cũ, trước khi sửa)

| Quy tắc | Công thức | Nơi dùng trước đây |
|---|---|---|
| Giá trị dòng | `(đơn giá + phụ phí topping) x số lượng` | tính trong SQL và `Model.Line.total()`; **không gom** (phép nhân thuần, không phải quy tắc dùng chung) |
| Khuyến mãi một dòng (BR-020) | `giá trị dòng x phần trăm / 100`, chia nguyên (bỏ phần lẻ) | `JdbcOpsService` (toOrder, amounts, quote), `InvoiceService` (hoàn một phần) |
| Điểm dùng tối đa (BR-023) | `giá trị sau KM x 30 / 100.000`, chia nguyên (= 30%, 1 điểm = 1.000đ, làm tròn xuống) | `JdbcOpsService.maxPoints` (4 chỗ gọi) |
| Số tiền phải trả (BR-021) | `làm tròn500(giá trị sau KM - điểm x 1.000)` | `JdbcOpsService.settle`, `InvoiceService` (tiền hoàn) |
| Làm tròn 500đ | gần nhất, **đúng giữa thì lên** (21.750 → 22.000) | **3 bản**: `JdbcOpsService.round500` (số thực), `Db.round500` (chia nguyên), `InMemoryOpsService` (số thực) |
| Điểm tích (BR-023) | `tiền thực trả / 10.000`, bỏ phần lẻ; số âm coi như 0 | `JdbcOpsService.settle`, `InvoiceService` (tích lại sau hoàn tiền) |

### Thay đổi

- Tạo `vn.vtph.coffee.shared.pricing.PricingPolicy` (lớp `final` thuần Java, hàm tĩnh, không import Spring/JDBC/HTTP, không import gói nghiệp vụ): `promotionDiscount`, `maxRedeemablePoints`, `roundToNearest500`, `payableAfterPoints`, `pointsEarned`.
- Số học bằng `long` và chia nguyên (VND là số nguyên). **Không dùng `double`**; không dùng `BigDecimal` vì mã cũ đã dùng số nguyên và `BigDecimal` không mang lại lợi ích ở đây.
- Thay thế ở: `JdbcOpsService`, `InvoiceService`, `InMemoryOpsService`; xóa `JdbcOpsService.round500`, `JdbcOpsService.maxPoints`, `Db.round500`.
- Giữ nguyên chi tiết chưa lý tưởng: hàm trả `int` bằng ép kiểu `(int)` (giá trị > ~2,1 tỷ đồng sẽ tràn, như mã cũ); không kiểm tra đầu vào.

### Test thêm (14 test, tổng 64 sau đợt review)

- `PricingPolicyTest` (9, thuần đơn vị): bảng giá trị biên (249/250/251/499/500/749/750, số âm), so sánh `roundToNearest500` với **cả hai** công thức cũ trên 5,05 triệu giá trị, so sánh `maxRedeemablePoints` và `payableAfterPoints` với công thức cũ trên lưới giá trị, ví dụ BR-023 (87.500đ → 26 điểm), khuyến mãi bỏ phần lẻ (12.345 x 15% = 1.851), điểm tích bỏ phần lẻ.
- `PricingRulesIntegrationTest` (5, MySQL thật; 4 test đầu viết và chạy đạt **trước** khi sửa mã, test thứ 5 thêm khi review): khuyến mãi 25% làm tròn nửa-lên và trần điểm ở đơn tại quán; báo giá + thanh toán mang đi + các cột lưu trên hóa đơn; trần 30% điểm, từ chối `POINTS_LIMIT`/`BAD_POINTS`/`NO_CUSTOMER`; hoàn một phần chia điểm theo tỷ lệ (4,75 → 4) và làm tròn tiền hoàn.

### Kết quả sau thay đổi

`mvn -B test`: **60 chạy, 0 lỗi, 0 bỏ qua**, `BUILD SUCCESS` (sau đợt review: 64, xem bên dưới). Không có chu trình gói mới (`shared` không import gói nào; `ops`→`shared`, `payment`→`shared`).

### Phát hiện chưa xử lý (ngoài phạm vi bước này)

1. **`ReportService.bestSellers` (SQL)** tính doanh thu dòng bằng `FLOOR(giá trị x (100 - %) / 100)`, còn khuyến mãi ở các nơi khác là `giá trị - FLOOR(giá trị x % / 100)`. Hai công thức chỉ khác nhau khi `giá trị x %` không chia hết cho 100 (khi đó báo cáo thấp hơn 1đ so với hóa đơn). **Đã đo trên dữ liệu mẫu**: 18 giá khác nhau, 5 mức topping, số lượng 1–3, phần trăm 1–50 (13.500 tổ hợp): **0 tổ hợp lệch**, vì mọi giá mẫu là bội số của 1.000đ. Lệch chỉ xuất hiện với giá không chia hết cho 100 (ví dụ 12.345đ giảm 15%: hóa đơn 10.494đ, báo cáo 10.493đ). Không sửa vì là SQL báo cáo và cần quyết định nghiệp vụ.
2. **Cột `invoice.subtotal` lưu số tiền SAU khuyến mãi** (không phải trước), còn `promotion_discount` lưu khuyến mãi. Đây là chủ ý của lược đồ (chú thích cột: "Giá món + topping, sau khuyến mãi") nhưng tên cột dễ gây hiểu nhầm; được bảo vệ bằng `PricingRulesIntegrationTest`. Không đổi tên (thay đổi lược đồ).
3. **Frontend lặp quy tắc để xem trước tiền**: `PayDialog.tsx`, `TakeawayPanel.tsx` có `round500 = Math.floor(n / 500 + 0.5) * 500` (cùng công thức số thực của `JdbcOpsService` cũ, nên cho cùng kết quả với `PricingPolicy`), trần điểm lấy từ `maxPoints` do backend trả và quy đổi 1.000đ riêng. Backend vẫn là nơi quyết định số tiền thật; cần giữ đồng bộ nếu đổi quy tắc.
4. **Tràn `int`** ở các cột/biến tiền (`int` trong `Model.Order`, `amounts()`): không xảy ra với giá trị đơn thực tế nhưng chưa có chặn.
5. Hàm "điểm hoàn theo tỷ lệ" của hoàn một phần (`used x giá trị dòng / giá trị đơn`) chỉ dùng ở `InvoiceService`, nên **chưa** đưa vào `PricingPolicy` (không phải quy tắc dùng chung). Có thể cân nhắc khi tách module `billing`.

### Chưa làm theo đúng phạm vi

- Đóng Swagger ở production (đã thống nhất, nhưng thuộc bước phân quyền/cấu hình sau, và bước 1 yêu cầu không đổi authorization).
- Bước 2 trở đi; chế độ in-memory vẫn giữ nguyên.

## Đợt review Bước 1 (2026-10-26)

Kết luận: **PASS WITH CONCERNS** (xem báo cáo trong phản hồi; chi tiết kỹ thuật ở dưới).

- **Đối chiếu từng phương thức với mã cũ** (`git show HEAD:...`): `promotionDiscount`, `maxRedeemablePoints`, `roundToNearest500`, `payableAfterPoints` tương đương mã cũ trên toàn miền số nguyên hợp lệ; thứ tự gọi trong `settle`/`quote`/`toOrder`/`cancelLine` không đổi (thay thế tại chỗ từng biểu thức).
- **Khác biệt duy nhất đã biết:** `settle` cũ tính điểm tích bằng `rounded / 10_000` không chặn số âm; `InvoiceService` cũ có `Math.max(0, ...)`. `pointsEarned` dùng cách chặn của `InvoiceService` cho cả hai. Miền số âm **không đạt được** ở `settle` (giá trị sau KM không âm, điểm dùng ≤ 30%, và CSDL có `CHECK (total >= 0)`, `points_earned UNSIGNED`); được ghi nhận bằng test `negativeAmountsAreTheOnlyKnownDifferenceFromTheOldSettleFormula` và `settlePathNeverProducesANegativeAmount`.
- **Hai công thức làm tròn cũ** (số thực ở `JdbcOpsService`/`InMemoryOpsService`, chia nguyên ở `Db`) cho **cùng kết quả** trên mọi giá trị đã kiểm (−50.000..5.000.000 và các giá trị lớn); `roundToNearest500` dùng dạng chia nguyên (chính xác, không phụ thuộc dấu phẩy động).
- **Kiểm thử đột biến thủ công** trên `PricingPolicy` (15 biến đổi: lệch nửa-xuống, floor/ceil, chia cắt thay `floorDiv`, ép `int` gây tràn, 30%→31%, 1.000→1.001, bỏ làm tròn, đổi thứ tự trừ điểm/làm tròn, bỏ chặn số âm...): 14/14 biến đổi khác nghĩa bị `PricingPolicyTest` phát hiện; biến đổi còn lại (làm tròn rồi mới trừ điểm) là **tương đương toán học** vì điểm x 1.000đ là bội số của 500đ. Riêng bộ test tích hợp ban đầu bỏ sót 3 biến đổi nhỏ (cắt phần lẻ khuyến mãi, 1.001đ/điểm, mẫu số 9.999) do các giá mẫu đều tròn; đã thêm 2 ca tích hợp (giảm 15% trên 12.345đ; 21.750đ trừ 2 điểm nằm đúng giữa mức) làm bộ test tích hợp phát hiện thêm 2 biến đổi đó. Biến đổi mẫu số 9.999 chỉ phân biệt được ở số tiền ≥ ~5 triệu đồng nên chỉ bộ test đơn vị phát hiện.
- **Test tham chiếu độc lập:** các công thức "cũ" trong `PricingPolicyTest` được kiểm tự động là trùng nguyên văn với mã ở commit `e35d3a4` (không so hàm với chính nó).

## Quyết định dọn cấu trúc (2026-10-26, bạn ủy quyền: chỉ cần không lỗi logic/nghiệp vụ)

| Hạng mục | Quyết định | Lý do và kiểm chứng |
|---|---|---|
| Giao diện web cũ `backend/src/main/resources/static/` | **Đã xóa** (12 tệp, khôi phục được từ commit `e35d3a4`) | Trùng chức năng với frontend React, không còn được tài liệu/Dockerfile/test nào dùng; API không đổi. Sau khi xóa, truy cập `/` trên backend nhận 404 (frontend chạy riêng ở 5173/nginx) |
| Hai nơi giữ SQL (`database/` và `backend/.../db/`) | **Một nguồn duy nhất là `database/`**; bản Flyway là tệp sinh ra, không sửa tay. Thêm `scripts/sync-migrations.py --check` (không ghi, thoát mã 1 nếu lệch), `make check-sql`, và CI dùng `--check` | Không đổi nội dung migration nên checksum Flyway giữ nguyên (đã kiểm tra: đang khớp; thử cố ý làm lệch 1 tệp thì `--check` báo lỗi, khôi phục lại thì đạt). Gộp hẳn thành một thư mục sẽ buộc đổi đường dẫn Flyway và có rủi ro lệch checksum, không cần thiết |
| Gói `table`, `kitchen`, `takeaway` (chỉ có `package-info`) và `common` phụ thuộc `ops` | **Giữ nguyên cho đến Bước 2–3** | Đây là thay đổi cấu trúc mã (chuyển `OpsException`, tách `JdbcOpsService`), chưa được duyệt thực hiện; di chuyển riêng lẻ các tệp mô tả không mang lại lợi ích và dễ làm mất ghi chú BR |
