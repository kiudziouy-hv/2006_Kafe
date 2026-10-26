-- =====================================================================
-- VTPH Coffee - Dữ liệu giao dịch mẫu cho ngày hôm nay (minh họa luồng nghiệp vụ và dữ liệu cho báo cáo)
-- Cần chạy sau 01..04. Chạy lại được: TRUNCATE xóa dữ liệu giao dịch cũ (không kích hoạt trigger chặn xóa; chỉ dùng trên CSDL mẫu).
-- =====================================================================
SET NAMES utf8mb4;
USE VTPH_Coffee;
SET FOREIGN_KEY_CHECKS = 0;
SET @OLD_SQL_SAFE = @@SQL_SAFE_UPDATES; SET SQL_SAFE_UPDATES = 0;
TRUNCATE TABLE point_transaction; TRUNCATE TABLE refund_record; TRUNCATE TABLE invoice; TRUNCATE TABLE order_line_topping; TRUNCATE TABLE order_line;
TRUNCATE TABLE waste_record; TRUNCATE TABLE stock_adjustment; TRUNCATE TABLE order_batch; TRUNCATE TABLE takeaway_order; TRUNCATE TABLE dine_in_order; TRUNCATE TABLE orders; TRUNCATE TABLE cashier_session;
SET FOREIGN_KEY_CHECKS = 1;
UPDATE dining_table SET status = 'EMPTY';
UPDATE customer SET points = CASE customer_id WHEN 1 THEN 24 WHEN 2 THEN 0 ELSE 8 END;
UPDATE ingredient i JOIN (SELECT ingredient_id, SUM(quantity) q FROM stock_receipt GROUP BY ingredient_id) s ON s.ingredient_id = i.ingredient_id SET i.current_stock = s.q WHERE i.track_expiry = 1;
UPDATE item_size SET status = 'SELLING', status_source = NULL;

-- Phiên ca thu ngân đang mở
INSERT INTO cashier_session (session_id, business_date, shift, opening_cash, opened_by)
VALUES (1, CURDATE(), 'EVENING', 500000, 2);

-- Đơn 1: tại quán, bàn 3, thành viên Nguyễn Thị Hoa dùng 10 điểm, trả tiền mặt
INSERT INTO orders (order_id, order_type, status, created_by) VALUES (1, 'DINE_IN', 'PROCESSING', 4);
INSERT INTO dine_in_order (order_id, table_id) VALUES (1, 3);
UPDATE dining_table SET status = 'SERVING' WHERE table_id = 3;
INSERT INTO order_batch (batch_id, order_id) VALUES (1, 1);
INSERT INTO order_line (line_id, batch_id, item_id, size, quantity, temperature, sugar_level, ice_level, unit_price, discount_percent, promotion_id)
VALUES (1, 1, 11, 'M', 1, 'COLD', 50, 'NORMAL', 45000, 0, NULL),    -- Trà đào cam sả M
       (2, 1, 24, 'M', 1, NULL, NULL, NULL, 45000, 10, 2);          -- Tiramisu M, khuyến mãi Cake Evening 10%
INSERT INTO order_line_topping (line_id, topping_id, surcharge) VALUES (1, 1, 8000);   -- Trân châu đen
UPDATE ingredient SET current_stock = current_stock - 1 WHERE name = 'Bánh tiramisu';  -- bánh trừ kho khi xác nhận đơn (BR-009)
CALL sp_start_making(1);
UPDATE order_line SET status = 'DONE' WHERE line_id = 1;
CALL sp_start_making(2);
UPDATE order_line SET status = 'DONE' WHERE line_id = 2;
UPDATE orders SET status = 'DONE' WHERE order_id = 1;
UPDATE dining_table SET status = 'WAITING_PAYMENT' WHERE table_id = 3;
-- (53.000 + 40.500) = 93.500; điểm dùng 10 = 10.000đ (<= 30%); 83.500 làm tròn 500 = 83.500; điểm tích = 8
INSERT INTO invoice (invoice_id, order_id, session_id, customer_id, payment_method, subtotal, promotion_discount, points_used, total, points_earned, issued_by)
VALUES (1, 1, 1, 1, 'CASH', 93500, 4500, 10, 83500, 8, 2);
INSERT INTO point_transaction (customer_id, invoice_id, type, points) VALUES (1, 1, 'REDEEM', 10), (1, 1, 'EARN', 8);
UPDATE customer SET points = points - 10 + 8 WHERE customer_id = 1;
UPDATE dining_table SET status = 'EMPTY' WHERE table_id = 3;

-- Đơn 2: mang đi, tiền mặt, thanh toán ngay khi xác nhận; món đang chờ pha chế (New)
INSERT INTO orders (order_id, order_type, status, created_by) VALUES (2, 'TAKEAWAY', 'PROCESSING', 2);
INSERT INTO takeaway_order (order_id, queue_date, queue_number, payment_method) VALUES (2, CURDATE(), 1, 'CASH');
INSERT INTO order_batch (batch_id, order_id) VALUES (2, 2);
INSERT INTO order_line (line_id, batch_id, item_id, size, quantity, temperature, sugar_level, ice_level, unit_price, discount_percent)
VALUES (3, 2, 2, 'L', 2, 'COLD', 70, 'NORMAL', 39000, 0);           -- Cà phê sữa L x2
INSERT INTO invoice (invoice_id, order_id, session_id, customer_id, payment_method, subtotal, promotion_discount, points_used, total, points_earned, issued_by)
VALUES (2, 2, 1, NULL, 'CASH', 78000, 0, 0, 78000, 0, 2);

-- Đơn 3: mang đi chuyển khoản/QR còn là đơn nháp (chưa nhận đủ tiền): không giữ nguyên liệu, chưa có hóa đơn
INSERT INTO orders (order_id, order_type, status, created_by) VALUES (3, 'TAKEAWAY', 'DRAFT', 2);
INSERT INTO takeaway_order (order_id, payment_method) VALUES (3, 'TRANSFER_QR');
INSERT INTO order_batch (batch_id, order_id) VALUES (3, 3);
INSERT INTO order_line (line_id, batch_id, item_id, size, quantity, temperature, sugar_level, ice_level, unit_price, discount_percent)
VALUES (4, 3, 12, 'M', 1, 'COLD', 50, 'NORMAL', 42000, 0);          -- Trà vải M

-- Hao hụt do hết hạn: pha chế đề xuất, chờ Chủ quán/Quản lý xác nhận
INSERT INTO waste_record (ingredient_id, quantity, reason, created_by) VALUES ((SELECT ingredient_id FROM ingredient WHERE name = 'Bánh croissant'), 2, 'hết hạn', 7);
SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE;
