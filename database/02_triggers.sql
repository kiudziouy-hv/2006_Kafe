-- =====================================================================
-- VTPH Coffee - Trigger thực thi quy tắc nghiệp vụ mà CHECK/UNIQUE không diễn đạt được
-- (BR-004, BR-011, BR-017, BR-025, BR-028, BR-030, BR-031, BR-035, BR-037, NFR-010, ASM-01)
-- =====================================================================
SET NAMES utf8mb4;
USE VTPH_Coffee;
DROP TRIGGER IF EXISTS trg_receipt_bi_expiry;
DROP TRIGGER IF EXISTS trg_dinein_bi_open_table;
DROP TRIGGER IF EXISTS trg_orders_au_release_table;
DROP TRIGGER IF EXISTS trg_invoice_bi_check;
DROP TRIGGER IF EXISTS trg_invoice_ai_release_table;
DROP TRIGGER IF EXISTS trg_invoice_bu_immutable;
DROP TRIGGER IF EXISTS trg_line_bu_transition;
DROP TRIGGER IF EXISTS trg_session_bu_close;
DROP TRIGGER IF EXISTS trg_day_bu_close;
DROP TRIGGER IF EXISTS trg_nodelete_invoice;
DROP TRIGGER IF EXISTS trg_nodelete_orders;
DROP TRIGGER IF EXISTS trg_nodelete_order_line;
DROP TRIGGER IF EXISTS trg_nodelete_refund;
DROP TRIGGER IF EXISTS trg_nodelete_point_tx;
DROP TRIGGER IF EXISTS trg_nodelete_session;

DELIMITER $$

-- BR-017: nguyên liệu theo dõi hạn dùng thì phiếu nhập phải có hạn sử dụng
CREATE TRIGGER trg_receipt_bi_expiry BEFORE INSERT ON stock_receipt FOR EACH ROW
BEGIN
  DECLARE v_track TINYINT;
  SELECT track_expiry INTO v_track FROM ingredient WHERE ingredient_id = NEW.ingredient_id;
  IF v_track = 1 AND NEW.expiry_date IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-017: nguyên liệu theo dõi hạn sử dụng phải nhập hạn sử dụng';
  END IF;
END$$

-- ASM-01: mỗi bàn tối đa một đơn đang mở (duy nhất trên open_table_id)
CREATE TRIGGER trg_dinein_bi_open_table BEFORE INSERT ON dine_in_order FOR EACH ROW
BEGIN
  SET NEW.open_table_id = NEW.table_id;
END$$

CREATE TRIGGER trg_orders_au_release_table AFTER UPDATE ON orders FOR EACH ROW
BEGIN
  IF NEW.status = 'CANCELLED' AND OLD.status <> 'CANCELLED' THEN
    UPDATE dine_in_order SET open_table_id = NULL WHERE order_id = NEW.order_id;
  END IF;
END$$

-- BR-028, BR-029, BR-035: điều kiện phát hành hóa đơn
CREATE TRIGGER trg_invoice_bi_check BEFORE INSERT ON invoice FOR EACH ROW
BEGIN
  DECLARE v_sstatus VARCHAR(10);
  DECLARE v_type VARCHAR(10);
  DECLARE v_ostatus VARCHAR(12);
  DECLARE v_pending INT;
  SELECT status INTO v_sstatus FROM cashier_session WHERE session_id = NEW.session_id;
  IF v_sstatus IS NULL OR v_sstatus <> 'OPEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-035/ASM-15: chỉ phát hành hóa đơn khi phiên ca thu ngân đang mở';
  END IF;
  SELECT order_type, status INTO v_type, v_ostatus FROM orders WHERE order_id = NEW.order_id;
  IF v_ostatus IN ('DRAFT','CANCELLED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-004/BR-014: đơn nháp hoặc đơn đã hủy không phát sinh hóa đơn';
  END IF;
  IF v_type = 'DINE_IN' THEN
    SELECT COUNT(*) INTO v_pending FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id
      WHERE b.order_id = NEW.order_id AND l.status IN ('NEW','MAKING');
    IF v_pending > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-028: đơn tại quán chỉ thanh toán khi mọi dòng món đã Done hoặc đã hủy';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_invoice_ai_release_table AFTER INSERT ON invoice FOR EACH ROW
BEGIN
  UPDATE dine_in_order SET open_table_id = NULL WHERE order_id = NEW.order_id;
END$$

-- BR-030/BR-031/BR-038: hóa đơn không sửa nội dung, chỉ chuyển PAID -> CANCELLED khi ca chưa chốt
CREATE TRIGGER trg_invoice_bu_immutable BEFORE UPDATE ON invoice FOR EACH ROW
BEGIN
  DECLARE v_sstatus VARCHAR(10);
  DECLARE v_making INT;
  IF NOT (OLD.order_id <=> NEW.order_id AND OLD.session_id <=> NEW.session_id AND OLD.customer_id <=> NEW.customer_id
      AND OLD.payment_method <=> NEW.payment_method AND OLD.subtotal <=> NEW.subtotal
      AND OLD.promotion_discount <=> NEW.promotion_discount AND OLD.points_used <=> NEW.points_used
      AND OLD.total <=> NEW.total AND OLD.points_earned <=> NEW.points_earned
      AND OLD.issued_at <=> NEW.issued_at AND OLD.issued_by <=> NEW.issued_by) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-030: không được sửa nội dung giao dịch của hóa đơn';
  END IF;
  IF OLD.status = 'CANCELLED' AND NOT (OLD.status <=> NEW.status AND OLD.cancel_reason <=> NEW.cancel_reason
      AND OLD.cancelled_by <=> NEW.cancelled_by AND OLD.cancelled_at <=> NEW.cancelled_at) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-030: hóa đơn đã hủy không chuyển sang trạng thái khác';
  END IF;
  IF OLD.status = 'PAID' AND NEW.status = 'CANCELLED' THEN
    SELECT status INTO v_sstatus FROM cashier_session WHERE session_id = OLD.session_id;
    IF v_sstatus <> 'OPEN' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-031/BR-038: chỉ hủy hóa đơn khi ca chứa hóa đơn chưa chốt';
    END IF;
    SELECT COUNT(*) INTO v_making FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id
      WHERE b.order_id = OLD.order_id AND l.status = 'MAKING';
    IF v_making > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-031: không hủy hóa đơn khi đơn còn món đang Making';
    END IF;
  END IF;
END$$

-- BR-004, BR-025: chuyển trạng thái dòng món New -> Making -> Done; hủy khi chưa Done
CREATE TRIGGER trg_line_bu_transition BEFORE UPDATE ON order_line FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    IF NOT ((OLD.status = 'NEW' AND NEW.status IN ('MAKING','CANCELLED'))
         OR (OLD.status = 'MAKING' AND NEW.status IN ('DONE','CANCELLED'))) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-004: chuyển trạng thái dòng món không hợp lệ (New -> Making -> Done; hủy khi chưa Done)';
    END IF;
    IF OLD.status = 'MAKING' AND NEW.status = 'CANCELLED' AND NEW.cancel_reason IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-025: hủy món đã Making bắt buộc ghi lý do';
    END IF;
  END IF;
END$$

-- Chốt ca: chặn khi còn đơn nháp (đã thống nhất với khách hàng, ISS-C4-10); lưu chênh lệch khớp
CREATE TRIGGER trg_session_bu_close BEFORE UPDATE ON cashier_session FOR EACH ROW
BEGIN
  DECLARE v_draft INT;
  IF OLD.status = 'OPEN' AND NEW.status = 'CLOSED' THEN
    SELECT COUNT(*) INTO v_draft FROM orders WHERE status = 'DRAFT';
    IF v_draft > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ISS-C4-10: còn đơn nháp chưa xác nhận hoặc chưa hủy, không được chốt ca';
    END IF;
  END IF;
  IF OLD.status = 'CLOSED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-038: phiên ca đã chốt không được chỉnh sửa';
  END IF;
END$$

-- BR-037: chốt ngày khi không còn phiên ca mở, không còn đơn mở và mọi bàn Trống
CREATE TRIGGER trg_day_bu_close BEFORE UPDATE ON business_day FOR EACH ROW
BEGIN
  DECLARE v_open_sessions INT; DECLARE v_open_orders INT; DECLARE v_tables INT;
  IF OLD.status = 'CLOSED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-038: ngày kinh doanh đã chốt không được chỉnh sửa';
  END IF;
  IF OLD.status = 'OPEN' AND NEW.status = 'CLOSED' THEN
    SELECT COUNT(*) INTO v_open_sessions FROM cashier_session WHERE business_date = OLD.business_date AND status = 'OPEN';
    SELECT COUNT(*) INTO v_open_orders FROM orders o WHERE o.status <> 'CANCELLED' AND (
        o.status = 'DRAFT'
        OR NOT EXISTS (SELECT 1 FROM invoice i WHERE i.order_id = o.order_id)
        OR EXISTS (SELECT 1 FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id
                   WHERE b.order_id = o.order_id AND l.status IN ('NEW','MAKING')));
    SELECT COUNT(*) INTO v_tables FROM dining_table WHERE status <> 'EMPTY';
    IF v_open_sessions > 0 OR v_open_orders > 0 OR v_tables > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR-037: chỉ chốt ngày khi không còn phiên ca mở, không còn đơn mở và mọi bàn Trống';
    END IF;
  END IF;
END$$

-- NFR-010: dữ liệu giao dịch không bị xóa cứng
CREATE TRIGGER trg_nodelete_invoice BEFORE DELETE ON invoice FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NFR-010/BR-030: không được xóa hóa đơn'$$
CREATE TRIGGER trg_nodelete_orders BEFORE DELETE ON orders FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NFR-010: không được xóa đơn hàng'$$
CREATE TRIGGER trg_nodelete_order_line BEFORE DELETE ON order_line FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NFR-010: không được xóa dòng món'$$
CREATE TRIGGER trg_nodelete_refund BEFORE DELETE ON refund_record FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NFR-010: không được xóa bản ghi hoàn tiền'$$
CREATE TRIGGER trg_nodelete_point_tx BEFORE DELETE ON point_transaction FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NFR-010: không được xóa lịch sử điểm'$$
CREATE TRIGGER trg_nodelete_session BEFORE DELETE ON cashier_session FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NFR-010: không được xóa phiên ca'$$

DELIMITER ;
