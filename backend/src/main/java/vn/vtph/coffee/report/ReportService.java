package vn.vtph.coffee.report;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vtph.coffee.common.Db;
import vn.vtph.coffee.ops.OpsException;

/**
 * UC-33 báo cáo doanh thu (M11). Doanh thu = hóa đơn đã thanh toán, không gồm hóa đơn đã hủy, trừ hoàn tiền một phần,
 * ghi nhận theo ngày thanh toán địa phương (BR-040); món và hóa đơn đã hủy không vào số lượng bán và món bán chạy (BR-041).
 */
@Service
@Profile("mysql")
@Transactional(readOnly = true)
public class ReportService {
    private final Db db;

    public ReportService(Db db) { this.db = db; }

    private java.time.LocalDateTime startUtc(LocalDate d) {
        return d.atStartOfDay(db.zone).toInstant().atZone(java.time.ZoneOffset.UTC).toLocalDateTime();
    }

    private static long num(Object o) { return o == null ? 0 : ((Number) o).longValue(); }

    public Map<String, Object> summary(LocalDate from, LocalDate to) {
        LocalDate t = to == null ? db.today() : to, f = from == null ? t : from;
        db.checkRange(f, t, 366);
        var lo = startUtc(f);
        var hi = startUtc(t.plusDays(1));

        Map<LocalDate, long[]> days = new LinkedHashMap<>();
        for (LocalDate d = f; !d.isAfter(t); d = d.plusDays(1)) days.put(d, new long[2]);
        long revenue = 0, invoices = 0, cash = 0, transfer = 0, refunded = 0;
        for (Map<String, Object> r : db.jdbc.queryForList("""
                SELECT DATE(CONVERT_TZ(i.issued_at, '+00:00', ?)) AS day, i.payment_method AS method, i.total,
                       COALESCE((SELECT SUM(r.cash_amount) FROM refund_record r WHERE r.invoice_id = i.invoice_id AND r.type = 'PARTIAL'), 0) AS refund
                FROM invoice i WHERE i.status = 'PAID' AND i.issued_at >= ? AND i.issued_at < ?""", db.offset(), lo, hi)) {
            long net = num(r.get("total")) - num(r.get("refund"));
            LocalDate day = ((java.sql.Date) r.get("day")).toLocalDate();
            long[] d = days.get(day);
            if (d != null) { d[0] += net; d[1]++; }
            revenue += net;
            invoices++;
            refunded += num(r.get("refund"));
            if ("CASH".equals(r.get("method"))) cash += net; else transfer += net;
        }
        long itemsSold = num(db.jdbc.queryForObject("""
                SELECT COALESCE(SUM(l.quantity), 0) FROM invoice i JOIN order_batch b ON b.order_id = i.order_id JOIN order_line l ON l.batch_id = b.batch_id
                WHERE i.status = 'PAID' AND l.status <> 'CANCELLED' AND i.issued_at >= ? AND i.issued_at < ?""", Long.class, lo, hi));
        Map<LocalDate, Long> itemsByDay = new LinkedHashMap<>();
        for (Map<String, Object> r : db.jdbc.queryForList("""
                SELECT DATE(CONVERT_TZ(i.issued_at, '+00:00', ?)) AS day, SUM(l.quantity) AS qty
                FROM invoice i JOIN order_batch b ON b.order_id = i.order_id JOIN order_line l ON l.batch_id = b.batch_id
                WHERE i.status = 'PAID' AND l.status <> 'CANCELLED' AND i.issued_at >= ? AND i.issued_at < ?
                GROUP BY day""", db.offset(), lo, hi))
            itemsByDay.put(((java.sql.Date) r.get("day")).toLocalDate(), num(r.get("qty")));
        List<Map<String, Object>> daily = new ArrayList<>();
        days.forEach((d, v) -> daily.add(Map.of("date", d.toString(), "revenue", v[0], "invoices", v[1], "items", itemsByDay.getOrDefault(d, 0L))));

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("from", f.toString());
        m.put("to", t.toString());
        m.put("revenue", revenue);
        m.put("invoices", invoices);
        m.put("itemsSold", itemsSold);
        m.put("average", invoices == 0 ? 0 : revenue / invoices);
        m.put("cashRevenue", cash);
        m.put("transferRevenue", transfer);
        m.put("refunded", refunded);
        m.put("empty", invoices == 0);
        m.put("daily", daily);
        m.put("bestSellers", db.rows("""
                SELECT m.name, SUM(l.quantity) AS quantity,
                       SUM(FLOOR((l.unit_price + COALESCE((SELECT SUM(surcharge) FROM order_line_topping WHERE line_id = l.line_id), 0)) * l.quantity * (100 - l.discount_percent) / 100)) AS revenue
                FROM invoice i JOIN order_batch b ON b.order_id = i.order_id JOIN order_line l ON l.batch_id = b.batch_id JOIN menu_item m ON m.item_id = l.item_id
                WHERE i.status = 'PAID' AND l.status <> 'CANCELLED' AND i.issued_at >= ? AND i.issued_at < ?
                GROUP BY m.item_id, m.name ORDER BY quantity DESC, m.name LIMIT 10""", lo, hi));
        m.put("byGroup", db.rows("""
                SELECT m.item_group AS `group`, SUM(l.quantity) AS quantity
                FROM invoice i JOIN order_batch b ON b.order_id = i.order_id JOIN order_line l ON l.batch_id = b.batch_id JOIN menu_item m ON m.item_id = l.item_id
                WHERE i.status = 'PAID' AND l.status <> 'CANCELLED' AND i.issued_at >= ? AND i.issued_at < ?
                GROUP BY m.item_group ORDER BY quantity DESC""", lo, hi));
        return m;
    }
}
