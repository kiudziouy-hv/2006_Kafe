package vn.vtph.coffee.shift;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vtph.coffee.common.Db;
import vn.vtph.coffee.ops.OpsException;

/**
 * UC-32 chốt ngày (FR-M10-008, BR-037, BR-038): chỉ khi phiên ca tối đã chốt, không còn đơn mở và mọi bàn Trống.
 * Trigger trg_day_bu_close là lớp bảo vệ thứ hai; ở đây kiểm tra trước để liệt kê đơn/bàn cần xử lý.
 */
@Service
@Profile("mysql")
@Transactional
public class DayService {
    private final Db db;
    private final OpenWork openWork;

    public DayService(Db db, OpenWork openWork) {
        this.db = db;
        this.openWork = openWork;
    }

    /** Ngày kinh doanh đang mở gần nhất, hoặc hôm nay nếu chưa có ngày nào mở. */
    private LocalDate currentDay() {
        LocalDate d = db.one("SELECT business_date FROM business_day WHERE status = 'OPEN' ORDER BY business_date DESC LIMIT 1", (rs, n) -> rs.getObject(1, LocalDate.class));
        return d == null ? db.today() : d;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> state() {
        LocalDate day = currentDay();
        String status = db.one("SELECT status FROM business_day WHERE business_date = ?", (rs, n) -> rs.getString(1), day);
        List<Map<String, Object>> sessions = db.rows("""
                SELECT s.session_id AS id, s.shift, s.status, s.opening_cash AS openingCash, s.expected_cash AS expectedCash, s.actual_cash AS actualCash,
                       s.difference, s.opened_at AS openedAt, s.closed_at AS closedAt, o.full_name AS openedBy, c.full_name AS closedBy,
                       (SELECT COUNT(*) FROM invoice i WHERE i.session_id = s.session_id AND i.status = 'PAID') AS invoices,
                       (SELECT COALESCE(SUM(i.total), 0) FROM invoice i WHERE i.session_id = s.session_id AND i.status = 'PAID') AS revenue
                FROM cashier_session s JOIN employee o ON o.employee_id = s.opened_by LEFT JOIN employee c ON c.employee_id = s.closed_by
                WHERE s.business_date = ? ORDER BY s.session_id""", day);
        List<Map<String, Object>> orders = openWork.orders();
        List<Map<String, Object>> tables = openWork.busyTables();
        boolean eveningClosed = sessions.stream().anyMatch(s -> "EVENING".equals(s.get("shift")) && "CLOSED".equals(s.get("status")));
        boolean anyOpen = sessions.stream().anyMatch(s -> "OPEN".equals(s.get("status")));
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("date", day.toString());
        m.put("status", status == null ? "NONE" : status);
        m.put("sessions", sessions);
        m.put("openOrders", orders);
        m.put("busyTables", tables);
        m.put("eveningClosed", eveningClosed);
        m.put("canClose", "OPEN".equals(status) && eveningClosed && !anyOpen && orders.isEmpty() && tables.isEmpty());
        return m;
    }

    public Map<String, Object> close() {
        Map<String, Object> st = state();
        if (!"OPEN".equals(st.get("status"))) throw new OpsException(409, "NO_OPEN_DAY", "Chưa có ngày kinh doanh nào đang mở.");
        boolean anyEvening = ((List<?>) st.get("sessions")).stream().anyMatch(s -> "EVENING".equals(((Map<?, ?>) s).get("shift")));
        if (!anyEvening) throw new OpsException(409, "NO_EVENING", "Hôm nay chưa mở ca tối, không thể chốt ngày.");
        if (!Boolean.TRUE.equals(st.get("eveningClosed"))) throw new OpsException(409, "EVENING_OPEN", "Phiên ca tối chưa chốt, hãy chốt ca trước.");
        List<?> orders = (List<?>) st.get("openOrders"), tables = (List<?>) st.get("busyTables");
        if (!orders.isEmpty() || !tables.isEmpty())
            throw new OpsException(409, "OPEN_ORDERS", "Còn " + orders.size() + " đơn mở và " + tables.size() + " bàn chưa Trống.", Map.of("orders", orders, "tables", tables));
        db.jdbc.update("UPDATE business_day SET status = 'CLOSED', closed_at = ? WHERE business_date = ? AND status = 'OPEN'", Db.nowUtc(), LocalDate.parse((String) st.get("date")));
        return state();
    }
}
