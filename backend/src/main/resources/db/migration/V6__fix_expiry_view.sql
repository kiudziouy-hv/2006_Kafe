-- Sinh tự động từ database/06_fix_expiry_view.sql bằng scripts/sync-migrations.py. Không sửa tay.
-- =====================================================================
-- VTPH Coffee - Sửa v_expiry_warning: bỏ phiếu nhập không còn gì cần kiểm tra (ASM-25)
-- Tách riêng khỏi 04 vì V4 đã chạy qua Flyway; sửa 04 sẽ làm lệch checksum.
-- =====================================================================
SET NAMES utf8mb4;

-- Cảnh báo hạn sử dụng trước 2 ngày, theo từng phiếu nhập, số lượng cần kiểm tra không vượt phiếu và tồn (FR-M06-008, BR-017).
-- Phiếu có số lượng cần kiểm tra bằng 0 (nguyên liệu đã hết tồn) không cảnh báo (ASM-25).
CREATE OR REPLACE VIEW v_expiry_warning AS
SELECT r.receipt_id, i.name AS ingredient, r.expiry_date,
       DATEDIFF(r.expiry_date, CURDATE()) AS days_left,
       LEAST(r.quantity, i.current_stock) AS quantity_to_check
FROM stock_receipt r JOIN ingredient i ON i.ingredient_id = r.ingredient_id
WHERE i.track_expiry = 1 AND r.expiry_date IS NOT NULL AND r.expiry_date <= CURDATE() + INTERVAL 2 DAY
  AND LEAST(r.quantity, i.current_stock) > 0;
