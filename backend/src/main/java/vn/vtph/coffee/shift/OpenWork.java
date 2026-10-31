package vn.vtph.coffee.shift;

import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Công việc còn dang dở (BR-037) mà chốt ngày và chốt ca tối phải chờ xử lý xong: đơn còn mở và bàn chưa Trống. */
@Component
@Profile("mysql")
public class OpenWork {
    private final JdbcTemplate jdbc;

    public OpenWork(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Đơn mở (BR-037): chưa hủy hết, và (nháp, chưa thanh toán, hoặc còn dòng New/Making kể cả đơn mang đi đã thanh toán). */
    public List<Map<String, Object>> orders() {
        return jdbc.queryForList("""
                SELECT o.order_id AS id, CASE WHEN o.order_type = 'DINE_IN' THEN CONCAT('Bàn ', t.number)
                       WHEN tk.queue_number IS NULL THEN 'Mang đi (nháp)' ELSE CONCAT('#', LPAD(tk.queue_number, 3, '0')) END AS label, o.status
                FROM orders o LEFT JOIN dine_in_order d ON d.order_id = o.order_id LEFT JOIN dining_table t ON t.table_id = d.table_id
                LEFT JOIN takeaway_order tk ON tk.order_id = o.order_id
                WHERE o.status <> 'CANCELLED' AND (o.status = 'DRAFT' OR NOT EXISTS (SELECT 1 FROM invoice i WHERE i.order_id = o.order_id)
                   OR EXISTS (SELECT 1 FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id WHERE b.order_id = o.order_id AND l.status IN ('NEW', 'MAKING')))
                ORDER BY o.order_id""");
    }

    public List<Map<String, Object>> busyTables() {
        return jdbc.queryForList("SELECT number, status FROM dining_table WHERE status <> 'EMPTY' ORDER BY number");
    }
}
