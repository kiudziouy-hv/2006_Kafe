-- =====================================================================
-- VTPH Coffee - Nhật ký in lại hóa đơn: ai in lại, lúc nào (UC-23, NFR-016)
-- Bảng riêng, không sửa bảng invoice nên không đụng trigger BR-030 (hóa đơn không đổi nội dung khi in lại).
-- =====================================================================
SET NAMES utf8mb4;
USE VTPH_Coffee;

CREATE TABLE IF NOT EXISTS invoice_reprint (
  reprint_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id  INT UNSIGNED NOT NULL,
  reprinted_by INT UNSIGNED NOT NULL COMMENT 'Nhân viên bấm in lại',
  reprinted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reprint_id),
  KEY ix_reprint_invoice (invoice_id),
  CONSTRAINT fk_reprint_invoice FOREIGN KEY (invoice_id) REFERENCES invoice (invoice_id),
  CONSTRAINT fk_reprint_by FOREIGN KEY (reprinted_by) REFERENCES employee (employee_id)
) ENGINE=InnoDB;

-- Hóa đơn cũ đã có reprint_count > 0 từ trước: không có thông tin người và giờ để điền, nên không tạo dòng.
