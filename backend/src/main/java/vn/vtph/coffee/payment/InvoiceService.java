package vn.vtph.coffee.payment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.auth.Role;
import vn.vtph.coffee.common.Db;
import vn.vtph.coffee.ops.OpsEvent;
import vn.vtph.coffee.ops.OpsException;
import vn.vtph.coffee.shared.pricing.PricingPolicy;

/**
 * Hóa đơn (M07): UC-34 danh sách và chi tiết, UC-23 in lại, UC-24 hủy hóa đơn, UC-13 hủy dòng món của đơn mang đi đã thanh toán
 * kèm bản điều chỉnh hoàn tiền một phần. Hóa đơn không bao giờ bị sửa hay xóa (BR-030); hoàn tiền ghi thành bản riêng (BR-027),
 * việc trả tiền thực tế nằm ngoài hệ thống và được Chủ quán xác nhận (BR-033).
 */
@Service
@Profile("mysql")
@Transactional
public class InvoiceService {
    private final Db db;
    private final ApplicationEventPublisher events;

    public InvoiceService(Db db, ApplicationEventPublisher events) {
        this.db = db;
        this.events = events;
    }

    private static final String HEAD_SQL = """
            SELECT i.invoice_id AS id, CONCAT('HD', LPAD(i.invoice_id, 4, '0')) AS invoiceNo, i.order_id AS orderId, o.order_type AS orderType,
                   t.number AS tableNo, tk.queue_number AS queueNumber, i.payment_method AS paymentMethod, i.subtotal, i.promotion_discount AS promotionDiscount,
                   i.points_used AS pointsUsed, i.total, i.points_earned AS pointsEarned, i.status, i.issued_at AS issuedAt, e.full_name AS issuedBy,
                   i.session_id AS sessionId, s.status AS sessionStatus, i.reprint_count AS reprintCount, c.customer_id AS customerId,
                   c.full_name AS customerName, c.phone AS customerPhone, i.cancel_reason AS cancelReason, i.cancelled_at AS cancelledAt, x.full_name AS cancelledBy,
                   (SELECT COALESCE(SUM(r.cash_amount), 0) FROM refund_record r WHERE r.invoice_id = i.invoice_id) AS refunded,
                   (SELECT COUNT(*) FROM refund_record r WHERE r.invoice_id = i.invoice_id AND r.confirmed_at IS NULL) AS refundsPending
            FROM invoice i JOIN orders o ON o.order_id = i.order_id JOIN employee e ON e.employee_id = i.issued_by
            JOIN cashier_session s ON s.session_id = i.session_id
            LEFT JOIN dine_in_order d ON d.order_id = o.order_id LEFT JOIN dining_table t ON t.table_id = d.table_id
            LEFT JOIN takeaway_order tk ON tk.order_id = o.order_id LEFT JOIN customer c ON c.customer_id = i.customer_id
            LEFT JOIN employee x ON x.employee_id = i.cancelled_by""";

    private java.time.LocalDateTime startUtc(LocalDate d) {
        return d.atStartOfDay(db.zone).toInstant().atZone(java.time.ZoneOffset.UTC).toLocalDateTime();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(LocalDate from, LocalDate to, String status, String q) {
        LocalDate t = to == null ? db.today() : to, f = from == null ? t.minusDays(6) : from;
        db.checkRange(f, t, 366);
        List<Object> args = new ArrayList<>(List.of(startUtc(f), startUtc(t.plusDays(1))));
        String sql = HEAD_SQL + " WHERE i.issued_at >= ? AND i.issued_at < ?";
        if (status != null && !status.isBlank()) { sql += " AND i.status = ?"; args.add(status); }
        if (q != null && !q.isBlank()) {
            sql += " AND (CONCAT('HD', LPAD(i.invoice_id, 4, '0')) LIKE ? OR c.phone LIKE ? OR c.full_name LIKE ?)";
            String like = "%" + q.trim() + "%";
            args.add(like); args.add(like); args.add(like);
        }
        return db.rows(sql + " ORDER BY i.issued_at DESC, i.invoice_id DESC LIMIT 500", args.toArray());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detail(int id) {
        Map<String, Object> inv = db.rowOr404(HEAD_SQL + " WHERE i.invoice_id = ?", "NO_INVOICE", "Không tìm thấy hóa đơn.", id);
        int orderId = ((Number) inv.get("orderId")).intValue();
        Map<Integer, List<String>> tops = new LinkedHashMap<>();
        db.jdbc.query("""
                SELECT olt.line_id, t.name FROM order_line_topping olt JOIN topping t ON t.topping_id = olt.topping_id
                JOIN order_line l ON l.line_id = olt.line_id JOIN order_batch b ON b.batch_id = l.batch_id WHERE b.order_id = ? ORDER BY olt.line_id, t.topping_id""",
                rs -> { tops.computeIfAbsent(rs.getInt(1), k -> new ArrayList<>()).add(rs.getString(2)); }, orderId);
        List<Map<String, Object>> lines = db.rows("""
                SELECT l.line_id AS id, m.name, l.size, m.item_group AS `group`, l.quantity, l.unit_price AS unitPrice,
                       COALESCE((SELECT SUM(surcharge) FROM order_line_topping WHERE line_id = l.line_id), 0) AS toppingTotal,
                       l.discount_percent AS discountPercent, l.status, l.cancel_reason AS cancelReason, l.temperature, l.sugar_level AS sugar, l.ice_level AS ice
                FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id JOIN menu_item m ON m.item_id = l.item_id
                WHERE b.order_id = ? ORDER BY l.line_id""", orderId);
        int alive = 0;
        for (Map<String, Object> l : lines) if (!"CANCELLED".equals(l.get("status"))) alive++;
        boolean takeaway = "TAKEAWAY".equals(inv.get("orderType")), paid = "PAID".equals(inv.get("status")), open = "OPEN".equals(inv.get("sessionStatus"));
        for (Map<String, Object> l : lines) {
            l.put("toppings", tops.getOrDefault(((Number) l.get("id")).intValue(), List.of()));
            l.put("canCancel", takeaway && paid && open && alive >= 2 && "NEW".equals(l.get("status")));
        }
        boolean making = lines.stream().anyMatch(l -> "MAKING".equals(l.get("status")));
        inv.put("lines", lines);
        inv.put("canCancel", paid && open && !making);
        inv.put("reprints", db.rows("""
                SELECT p.reprinted_at AS reprintedAt, e.full_name AS reprintedBy FROM invoice_reprint p JOIN employee e ON e.employee_id = p.reprinted_by
                WHERE p.invoice_id = ? ORDER BY p.reprint_id""", id));
        inv.put("refunds", db.rows("""
                SELECT r.refund_id AS id, r.type, r.order_line_id AS lineId, r.cash_amount AS cashAmount, r.points_refunded AS pointsRefunded, r.reason,
                       r.created_at AS createdAt, c.full_name AS createdBy, r.confirmed_at AS confirmedAt, f.full_name AS confirmedBy
                FROM refund_record r JOIN employee c ON c.employee_id = r.created_by LEFT JOIN employee f ON f.employee_id = r.confirmed_by
                WHERE r.invoice_id = ? ORDER BY r.refund_id""", id));
        return inv;
    }

    /** UC-23: ghi nhận lần in lại; giao diện in bản có dấu "Reprint" (NFR-016). Hóa đơn đã hủy chỉ Chủ quán/Quản lý in lại (UC-23 E2). */
    public Map<String, Object> reprint(int id, Account by) {
        if ("CANCELLED".equals(detail(id).get("status")) && by.role != Role.OWNER)
            throw new OpsException(403, "CANCELLED_OWNER_ONLY", "Hóa đơn đã hủy chỉ Chủ quán/Quản lý được in lại.");
        // Chỉ tăng bộ đếm và ghi nhật ký (ai, lúc nào); không đụng nội dung giao dịch, doanh thu hay trạng thái (BR-030 do trigger bảo vệ).
        db.jdbc.update("UPDATE invoice SET reprint_count = reprint_count + 1 WHERE invoice_id = ?", id);
        db.jdbc.update("INSERT INTO invoice_reprint (invoice_id, reprinted_by) VALUES (?, ?)", id, db.employeeId(by));
        return detail(id);
    }

    // ================= UC-24 hủy hóa đơn =================
    public Map<String, Object> cancel(int id, String reason, Account by) {
        if (reason == null || reason.isBlank()) throw new OpsException(422, "REASON_REQUIRED", "Vui lòng nhập lý do hủy hóa đơn.");
        Map<String, Object> inv = db.row("SELECT * FROM invoice WHERE invoice_id = ? FOR UPDATE", id);
        if (inv == null) throw new OpsException(404, "NO_INVOICE", "Không tìm thấy hóa đơn.");
        if (!"PAID".equals(inv.get("status"))) throw new OpsException(409, "ALREADY_CANCELLED", "Hóa đơn đã bị hủy.");
        int orderId = ((Number) inv.get("order_id")).intValue(), sessionId = ((Number) inv.get("session_id")).intValue();
        if (!"OPEN".equals(db.one("SELECT status FROM cashier_session WHERE session_id = ?", (rs, n) -> rs.getString(1), sessionId)))
            throw new OpsException(409, "SESSION_CLOSED", "Ca chứa hóa đơn đã chốt, không thể hủy hóa đơn.");
        if (db.jdbc.queryForObject("""
                SELECT COUNT(*) FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id WHERE b.order_id = ? AND l.status = 'MAKING'""", Integer.class, orderId) > 0)
            throw new OpsException(409, "LINE_MAKING", "Đơn còn món đang pha, không thể hủy hóa đơn.");
        int emp = db.employeeId(by);
        // Các món còn New bị hủy theo, bánh cộng lại kho; món đã xong giữ nguyên, không hoàn kho (BR-031)
        for (Map<String, Object> l : db.jdbc.queryForList("""
                SELECT l.line_id, l.item_id, l.size, l.quantity, m.item_group, m.name FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id
                JOIN menu_item m ON m.item_id = l.item_id WHERE b.order_id = ? AND l.status = 'NEW'""", orderId))
            cancelNewLine(l, reason, emp, orderId);
        settleOrderStatus(orderId);
        db.jdbc.update("UPDATE invoice SET status = 'CANCELLED', cancel_reason = ?, cancelled_by = ?, cancelled_at = ? WHERE invoice_id = ?", reason.trim(), emp, Db.nowUtc(), id);
        // Điểm: hoàn điểm đã dùng, thu hồi điểm đã tích tối đa bằng số điểm hiện có, phần thiếu ghi vào lịch sử (BR-032)
        Integer cust = inv.get("customer_id") == null ? null : ((Number) inv.get("customer_id")).intValue();
        int used = ((Number) inv.get("points_used")).intValue();
        int refundedPoints = db.jdbc.queryForObject("SELECT COALESCE(SUM(points_refunded), 0) FROM refund_record WHERE invoice_id = ?", Integer.class, id);
        if (cust != null) {
            giveBackPoints(cust, id, used - refundedPoints);
            revokeEarned(cust, id, 0);
        }
        long cashPaid = ((Number) inv.get("total")).longValue();
        long refundedCash = db.jdbc.queryForObject("SELECT COALESCE(SUM(cash_amount), 0) FROM refund_record WHERE invoice_id = ?", Long.class, id);
        db.jdbc.update("""
                INSERT INTO refund_record (invoice_id, type, cash_amount, points_refunded, reason, created_at, created_by) VALUES (?, 'FULL', ?, ?, ?, ?, ?)""",
                id, Math.max(0, cashPaid - refundedCash), used - refundedPoints, reason.trim(), Db.nowUtc(), emp);
        return detail(id);
    }

    private void cancelNewLine(Map<String, Object> l, String reason, int emp, int orderId) {
        int lineId = ((Number) l.get("line_id")).intValue();
        if ("CAKE".equals(l.get("item_group"))) {
            for (Map<String, Object> rl : db.jdbc.queryForList("""
                    SELECT rl.ingredient_id, rl.quantity FROM recipe r JOIN recipe_line rl ON rl.recipe_id = r.recipe_id WHERE r.item_id = ? AND r.size = ?""",
                    l.get("item_id"), l.get("size"))) {
                db.jdbc.update("UPDATE ingredient SET current_stock = current_stock + ? WHERE ingredient_id = ?",
                        ((BigDecimal) rl.get("quantity")).multiply(BigDecimal.valueOf(((Number) l.get("quantity")).longValue())), rl.get("ingredient_id"));
            }
        }
        db.jdbc.update("UPDATE order_line SET status = 'CANCELLED', cancel_reason = ?, cancelled_by = ?, cancelled_at = ? WHERE line_id = ?", reason.trim(), emp, Db.nowUtc(), lineId);
        String label = db.one("""
                SELECT CASE WHEN o.order_type = 'DINE_IN' THEN CONCAT('Bàn ', t.number) ELSE CONCAT('#', LPAD(tk.queue_number, 3, '0')) END
                FROM orders o LEFT JOIN dine_in_order d ON d.order_id = o.order_id LEFT JOIN dining_table t ON t.table_id = d.table_id
                LEFT JOIN takeaway_order tk ON tk.order_id = o.order_id WHERE o.order_id = ?""", (rs, n) -> rs.getString(1), orderId);
        events.publishEvent(new OpsEvent("LINE_CANCELLED", Map.of("orderId", orderId, "lineId", lineId, "label", String.valueOf(label), "name", String.valueOf(l.get("name")))));
    }

    /** Sau khi hủy các dòng New: hết dòng sống thì đơn Cancelled; còn lại toàn dòng Done thì đơn Done (BR-004). */
    private void settleOrderStatus(int orderId) {
        int alive = db.jdbc.queryForObject("""
                SELECT COUNT(*) FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id WHERE b.order_id = ? AND l.status <> 'CANCELLED'""", Integer.class, orderId);
        if (alive == 0) db.jdbc.update("UPDATE orders SET status = 'CANCELLED' WHERE order_id = ? AND status <> 'CANCELLED'", orderId);
        else db.jdbc.update("""
                UPDATE orders SET status = 'DONE' WHERE order_id = ? AND status = 'PROCESSING' AND NOT EXISTS (
                  SELECT 1 FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id WHERE b.order_id = orders.order_id AND l.status IN ('NEW', 'MAKING'))""", orderId);
    }

    private void giveBackPoints(int customerId, int invoiceId, int points) {
        if (points <= 0) return;
        db.jdbc.update("UPDATE customer SET points = points + ? WHERE customer_id = ?", points, customerId);
        db.jdbc.update("INSERT INTO point_transaction (customer_id, invoice_id, type, points, created_at) VALUES (?, ?, 'REFUND', ?, ?)", customerId, invoiceId, points, Db.nowUtc());
    }

    /** Thu hồi để số điểm tích còn lại của hóa đơn bằng {@code target}; chỉ thu hồi tối đa số điểm hiện có, phần thiếu ghi vào shortfall. */
    private void revokeEarned(int customerId, int invoiceId, int target) {
        int net = db.jdbc.queryForObject("""
                SELECT COALESCE(SUM(CASE type WHEN 'EARN' THEN points WHEN 'REVOKE' THEN -points ELSE 0 END), 0) FROM point_transaction
                WHERE invoice_id = ? AND customer_id = ?""", Integer.class, invoiceId, customerId);
        int need = net - target;
        if (need <= 0) return;
        int have = db.jdbc.queryForObject("SELECT points FROM customer WHERE customer_id = ? FOR UPDATE", Integer.class, customerId);
        int revoke = Math.min(need, have);
        db.jdbc.update("UPDATE customer SET points = points - ? WHERE customer_id = ?", revoke, customerId);
        db.jdbc.update("INSERT INTO point_transaction (customer_id, invoice_id, type, points, shortfall, created_at) VALUES (?, ?, 'REVOKE', ?, ?, ?)",
                customerId, invoiceId, revoke, need - revoke, Db.nowUtc());
    }

    // ================= UC-13 hủy riêng dòng món của đơn mang đi đã thanh toán =================
    public Map<String, Object> cancelLine(int invoiceId, int lineId, String reason, Account by) {
        if (reason == null || reason.isBlank()) throw new OpsException(422, "REASON_REQUIRED", "Vui lòng nhập lý do hủy.");
        Map<String, Object> inv = db.row("SELECT * FROM invoice WHERE invoice_id = ? FOR UPDATE", invoiceId);
        if (inv == null) throw new OpsException(404, "NO_INVOICE", "Không tìm thấy hóa đơn.");
        int orderId = ((Number) inv.get("order_id")).intValue();
        if (!"TAKEAWAY".equals(db.one("SELECT order_type FROM orders WHERE order_id = ?", (rs, n) -> rs.getString(1), orderId)))
            throw new OpsException(409, "NOT_TAKEAWAY", "Chỉ hủy riêng dòng món của đơn mang đi đã thanh toán.");
        if (!"PAID".equals(inv.get("status"))) throw new OpsException(409, "ALREADY_CANCELLED", "Hóa đơn đã bị hủy.");
        if (!"OPEN".equals(db.one("SELECT status FROM cashier_session WHERE session_id = ?", (rs, n) -> rs.getString(1), ((Number) inv.get("session_id")).intValue())))
            throw new OpsException(409, "SESSION_CLOSED", "Ca chứa hóa đơn đã chốt, không thể hủy dòng món.");
        Map<String, Object> l = db.row("""
                SELECT l.line_id, l.item_id, l.size, l.quantity, l.unit_price, l.discount_percent, l.status, m.item_group, m.name,
                       COALESCE((SELECT SUM(surcharge) FROM order_line_topping WHERE line_id = l.line_id), 0) AS tsur
                FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id JOIN menu_item m ON m.item_id = l.item_id
                WHERE l.line_id = ? AND b.order_id = ? FOR UPDATE""", lineId, orderId);
        if (l == null) throw new OpsException(404, "NO_LINE", "Không tìm thấy dòng món.");
        if (!"NEW".equals(l.get("status"))) throw new OpsException(409, "CANNOT_CANCEL", "Chỉ hủy được dòng món còn New.");
        int alive = db.jdbc.queryForObject("""
                SELECT COUNT(*) FROM order_line x JOIN order_batch b ON b.batch_id = x.batch_id WHERE b.order_id = ? AND x.status <> 'CANCELLED'""", Integer.class, orderId);
        if (alive < 2) throw new OpsException(409, "LAST_LINE", "Dòng món còn lại duy nhất của đơn không được hủy riêng, hãy hủy hóa đơn.");
        int emp = db.employeeId(by);

        // Số tiền hoàn: giá trị dòng sau khuyến mãi; điểm hoàn = phần nguyên của (điểm đã dùng x tỷ lệ dòng/đơn); tiền = giá trị - điểm, làm tròn 500đ, không vượt số đã thực trả (BR-027)
        long value = (((Number) l.get("unit_price")).longValue() + ((Number) l.get("tsur")).longValue()) * ((Number) l.get("quantity")).longValue();
        long after = value - PricingPolicy.promotionDiscount(value, ((Number) l.get("discount_percent")).intValue());
        long orderAfter = ((Number) inv.get("subtotal")).longValue();
        int used = ((Number) inv.get("points_used")).intValue();
        int refundPoints = orderAfter <= 0 ? 0 : (int) (used * after / orderAfter);
        long alreadyCash = db.jdbc.queryForObject("SELECT COALESCE(SUM(cash_amount), 0) FROM refund_record WHERE invoice_id = ?", Long.class, invoiceId);
        long cash = Math.max(0, Math.min(PricingPolicy.payableAfterPoints(after, refundPoints), ((Number) inv.get("total")).longValue() - alreadyCash));
        cancelNewLine(l, reason, emp, orderId);
        settleOrderStatus(orderId);
        db.insertId("""
                INSERT INTO refund_record (invoice_id, order_line_id, type, cash_amount, points_refunded, reason, created_at, created_by) VALUES (?, ?, 'PARTIAL', ?, ?, ?, ?, ?)""",
                invoiceId, lineId, cash, refundPoints, reason.trim(), Db.nowUtc(), emp);
        if (inv.get("customer_id") != null) {
            int cust = ((Number) inv.get("customer_id")).intValue();
            giveBackPoints(cust, invoiceId, refundPoints);
            long paidNow = ((Number) inv.get("total")).longValue() - alreadyCash - cash; // điểm tích được tính lại trên số tiền còn lại
            revokeEarned(cust, invoiceId, PricingPolicy.pointsEarned(paidNow));
        }
        return detail(invoiceId);
    }

    /** FR-M04-008, BR-033: Chủ quán/Quản lý xác nhận đã trả tiền cho khách ngoài hệ thống. */
    public Map<String, Object> confirmRefund(int refundId, Account by) {
        Map<String, Object> r = db.row("SELECT invoice_id, confirmed_at FROM refund_record WHERE refund_id = ? FOR UPDATE", refundId);
        if (r == null) throw new OpsException(404, "NO_REFUND", "Không tìm thấy bản hoàn tiền.");
        if (r.get("confirmed_at") != null) throw new OpsException(409, "ALREADY_CONFIRMED", "Khoản hoàn tiền này đã được xác nhận.");
        db.jdbc.update("UPDATE refund_record SET confirmed_at = ?, confirmed_by = ? WHERE refund_id = ?", Db.nowUtc(), db.employeeId(by), refundId);
        return detail(((Number) r.get("invoice_id")).intValue());
    }
}
