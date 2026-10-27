-- =====================================================================
-- VTPH Coffee - Bổ sung lược đồ cho backend (chạy SAU 01..05; chạy lại được)
--
-- Vì sao cần: đơn nháp chuyển khoản/QR (FR-M04-003, ASM-03) phải nhớ "số tiền đã báo cho khách",
-- thành viên và số điểm định dùng để lúc xác nhận so khớp lại. Lược đồ gốc (01_schema.sql) chưa có
-- chỗ lưu các thông tin này nên được thêm ở đây thay vì sửa file của nhóm. Nếu nhóm muốn gộp vào
-- 01_schema.sql thì chuyển 3 cột và 1 khóa ngoại dưới đây sang bảng takeaway_order rồi bỏ file này.
-- =====================================================================
SET NAMES utf8mb4;
USE VTPH_Coffee;

DROP PROCEDURE IF EXISTS sp_add_column_if_missing;
DROP PROCEDURE IF EXISTS sp_add_fk_if_missing;
DELIMITER $$

CREATE PROCEDURE sp_add_column_if_missing(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition VARCHAR(1000))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_column) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE sp_add_fk_if_missing(IN p_table VARCHAR(64), IN p_name VARCHAR(64), IN p_definition VARCHAR(1000))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                  WHERE table_schema = DATABASE() AND table_name = p_table
                    AND constraint_name = p_name AND constraint_type = 'FOREIGN KEY') THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_name, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- Đơn mang đi: số tiền đã báo khách (chỉ có ý nghĩa với đơn nháp chuyển khoản/QR), thành viên và điểm định dùng.
CALL sp_add_column_if_missing('takeaway_order', 'quoted_total',
  "BIGINT NULL COMMENT 'Số tiền đã báo cho khách khi tạo đơn nháp; xác nhận lệch thì chặn (ASM-03)'");
CALL sp_add_column_if_missing('takeaway_order', 'customer_id',
  "INT UNSIGNED NULL COMMENT 'Thành viên gắn với đơn nháp (tra cứu bằng số điện thoại)'");
CALL sp_add_column_if_missing('takeaway_order', 'points_to_use',
  "INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số điểm định dùng khi xác nhận đơn nháp'");
CALL sp_add_fk_if_missing('takeaway_order', 'fk_takeaway_customer',
  'FOREIGN KEY (customer_id) REFERENCES customer (customer_id)');

DROP PROCEDURE sp_add_column_if_missing;
DROP PROCEDURE sp_add_fk_if_missing;
