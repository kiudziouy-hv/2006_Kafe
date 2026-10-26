-- Sinh tự động từ database/04_views_procedures.sql bằng scripts/sync-migrations.py. Không sửa tay.
-- =====================================================================
-- VTPH Coffee - View báo cáo/tra cứu và thủ tục pha chế
-- =====================================================================
SET NAMES utf8mb4;

-- Tồn khả dụng = tồn hiện tại - lượng dự kiến của các dòng đồ uống New của đơn đã xác nhận (BR-008, FR-M03-004).
-- Đơn nháp không giữ nguyên liệu; bánh đã trừ kho khi xác nhận nên không tính.
CREATE OR REPLACE VIEW v_available_stock AS
SELECT i.ingredient_id, i.name, i.unit, i.current_stock,
       COALESCE(r.reserved, 0) AS reserved_for_new_lines,
       i.current_stock - COALESCE(r.reserved, 0) AS available_stock
FROM ingredient i
LEFT JOIN (
  SELECT x.ingredient_id, SUM(x.need) AS reserved FROM (
    SELECT rl.ingredient_id, rl.quantity * l.quantity AS need
      FROM order_line l
      JOIN order_batch b ON b.batch_id = l.batch_id
      JOIN orders o ON o.order_id = b.order_id AND o.status <> 'DRAFT' AND o.status <> 'CANCELLED'
      JOIN menu_item m ON m.item_id = l.item_id AND m.item_group <> 'CAKE'
      JOIN recipe r ON r.item_id = l.item_id AND r.size = l.size
      JOIN recipe_line rl ON rl.recipe_id = r.recipe_id
     WHERE l.status = 'NEW'
    UNION ALL
    SELECT rl.ingredient_id, rl.quantity * l.quantity
      FROM order_line l
      JOIN order_batch b ON b.batch_id = l.batch_id
      JOIN orders o ON o.order_id = b.order_id AND o.status <> 'DRAFT' AND o.status <> 'CANCELLED'
      JOIN menu_item m ON m.item_id = l.item_id AND m.item_group <> 'CAKE'
      JOIN order_line_topping t ON t.line_id = l.line_id
      JOIN recipe r ON r.topping_id = t.topping_id
      JOIN recipe_line rl ON rl.recipe_id = r.recipe_id
     WHERE l.status = 'NEW'
  ) x GROUP BY x.ingredient_id
) r ON r.ingredient_id = i.ingredient_id;

-- Cảnh báo tồn kho thấp (FR-M06-007)
CREATE OR REPLACE VIEW v_low_stock AS
SELECT ingredient_id, name, unit, current_stock, min_stock
FROM ingredient WHERE current_stock < min_stock;

-- Cảnh báo hạn sử dụng trước 2 ngày, theo từng phiếu nhập, số lượng cần kiểm tra không vượt phiếu và tồn (FR-M06-008, BR-017)
CREATE OR REPLACE VIEW v_expiry_warning AS
SELECT r.receipt_id, i.name AS ingredient, r.expiry_date,
       DATEDIFF(r.expiry_date, CURDATE()) AS days_left,
       LEAST(r.quantity, i.current_stock) AS quantity_to_check
FROM stock_receipt r JOIN ingredient i ON i.ingredient_id = r.ingredient_id
WHERE i.track_expiry = 1 AND r.expiry_date IS NOT NULL AND r.expiry_date <= CURDATE() + INTERVAL 2 DAY;

-- Doanh thu theo ngày thanh toán: hóa đơn chưa hủy, trừ hoàn tiền một phần (BR-040, M11)
CREATE OR REPLACE VIEW v_revenue_by_day AS
SELECT DATE(i.issued_at) AS pay_date,
       COUNT(*) AS invoice_count,
       SUM(i.total) - COALESCE(SUM(p.partial_refund), 0) AS revenue
FROM invoice i
LEFT JOIN (SELECT invoice_id, SUM(cash_amount) AS partial_refund FROM refund_record WHERE type = 'PARTIAL' GROUP BY invoice_id) p
       ON p.invoice_id = i.invoice_id
WHERE i.status = 'PAID'
GROUP BY DATE(i.issued_at);

-- Món bán chạy: không tính dòng món đã hủy và hóa đơn đã hủy (BR-041, FR-M11-005)
CREATE OR REPLACE VIEW v_best_sellers AS
SELECT m.item_id, m.name, SUM(l.quantity) AS sold_quantity
FROM invoice i
JOIN order_batch b ON b.order_id = i.order_id
JOIN order_line l ON l.batch_id = b.batch_id AND l.status <> 'CANCELLED'
JOIN menu_item m ON m.item_id = l.item_id
WHERE i.status = 'PAID'
GROUP BY m.item_id, m.name
ORDER BY sold_quantity DESC;

DROP PROCEDURE IF EXISTS sp_start_making;
DELIMITER $$
-- Chuyển dòng món sang Making: kiểm tra đủ nguyên liệu, trừ kho đồ uống (BR-009, BR-010, BR-011).
CREATE PROCEDURE sp_start_making(IN p_line_id INT UNSIGNED)
BEGIN
  DECLARE v_status VARCHAR(12);
  DECLARE v_group VARCHAR(12);
  DECLARE v_item INT UNSIGNED;
  DECLARE v_size CHAR(1);
  DECLARE v_short INT;
  SELECT l.status, m.item_group, l.item_id, l.size INTO v_status, v_group, v_item, v_size
    FROM order_line l JOIN menu_item m ON m.item_id = l.item_id WHERE l.line_id = p_line_id;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy dòng món';
  END IF;
  IF v_status <> 'NEW' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-004: chỉ chuyển sang Making khi dòng món đang New';
  END IF;
  IF v_group <> 'CAKE' THEN
    DROP TEMPORARY TABLE IF EXISTS tmp_need;
    CREATE TEMPORARY TABLE tmp_need AS
      SELECT ingredient_id, SUM(need) AS need FROM (
        SELECT rl.ingredient_id, rl.quantity * l.quantity AS need
          FROM order_line l JOIN recipe r ON r.item_id = l.item_id AND r.size = l.size
          JOIN recipe_line rl ON rl.recipe_id = r.recipe_id WHERE l.line_id = p_line_id
        UNION ALL
        SELECT rl.ingredient_id, rl.quantity * l.quantity
          FROM order_line l JOIN order_line_topping t ON t.line_id = l.line_id
          JOIN recipe r ON r.topping_id = t.topping_id JOIN recipe_line rl ON rl.recipe_id = r.recipe_id
         WHERE l.line_id = p_line_id) u GROUP BY ingredient_id;
    SELECT COUNT(*) INTO v_short FROM tmp_need n JOIN ingredient i ON i.ingredient_id = n.ingredient_id WHERE i.current_stock < n.need;
    IF v_short > 0 THEN
      UPDATE item_size SET status = 'OUT_OF_STOCK', status_source = 'SYSTEM' WHERE item_id = v_item AND size = v_size;
      DROP TEMPORARY TABLE tmp_need;
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-010: không đủ nguyên liệu, giữ dòng món ở New và chuyển kích thước sang Hết hàng';
    END IF;
    UPDATE ingredient i JOIN tmp_need n ON n.ingredient_id = i.ingredient_id SET i.current_stock = i.current_stock - n.need;
    DROP TEMPORARY TABLE tmp_need;
  END IF;
  UPDATE order_line SET status = 'MAKING' WHERE line_id = p_line_id;
END$$
DELIMITER ;
