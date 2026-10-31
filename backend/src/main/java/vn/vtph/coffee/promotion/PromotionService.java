package vn.vtph.coffee.promotion;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vtph.coffee.common.Db;
import vn.vtph.coffee.ops.OpsException;

/**
 * UC-27 quản lý chương trình khuyến mãi (FR-M09, BR-019, BR-020): giảm theo phần trăm cho một nhóm món,
 * trong khoảng ngày (tùy chọn) và khung giờ lặp lại mỗi ngày. Một món chỉ nhận một chương trình: chọn mức giảm cao hơn,
 * bằng nhau thì chương trình tạo trước (ASM-21).
 */
@Service
@Profile("mysql")
@Transactional
public class PromotionService {
    private static final List<String> GROUPS = List.of("COFFEE", "TEA", "SMOOTHIE", "CAKE");
    private final Db db;

    public PromotionService(Db db) { this.db = db; }

    /** Chương trình đang áp dụng cho nhóm món tại thời điểm {@code date} {@code time} (giờ địa phương), hoặc null. */
    public record Applied(int id, int percent) {}

    @Transactional(readOnly = true)
    public Applied bestFor(String group, LocalDate date, LocalTime time) {
        return db.one("""
                SELECT promotion_id, discount_percent FROM promotion
                WHERE active = 1 AND item_group = ? AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)
                  AND ((daily_start <= daily_end AND ? >= daily_start AND ? < daily_end)
                    OR (daily_start > daily_end AND (? >= daily_start OR ? < daily_end)))
                ORDER BY discount_percent DESC, created_at, promotion_id LIMIT 1""",
                (rs, n) -> new Applied(rs.getInt(1), rs.getInt(2)), group, date, date, time, time, time, time);
    }

    private static final String SELECT = """
            SELECT promotion_id AS id, name, item_group AS `group`, discount_percent AS discountPercent, start_date AS startDate, end_date AS endDate,
                   TIME_FORMAT(daily_start, '%H:%i') AS dailyStart, TIME_FORMAT(daily_end, '%H:%i') AS dailyEnd, active FROM promotion""";

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list() { return db.rows(SELECT + " ORDER BY active DESC, promotion_id DESC"); }

    private Map<String, Object> get(int id) {
        return db.rowOr404(SELECT + " WHERE promotion_id = ?", "NO_PROMOTION", "Không tìm thấy chương trình.", id);
    }

    private static LocalTime time(Map<String, Object> b, String key, String label) {
        try {
            return LocalTime.parse(Db.req(b, key, label));
        } catch (java.time.format.DateTimeParseException e) {
            throw new OpsException(422, "BAD_TIME", label + " không hợp lệ (HH:mm).");
        }
    }

    private static LocalDate date(Map<String, Object> b, String key, String label) {
        String s = Db.str(b, key);
        if (s == null || s.isEmpty()) return null;
        try {
            return LocalDate.parse(s);
        } catch (java.time.format.DateTimeParseException e) {
            throw new OpsException(422, "BAD_DATE", label + " không hợp lệ.");
        }
    }

    private Object[] parse(Map<String, Object> b) {
        String name = Db.req(b, "name", "Tên chương trình", 100);
        String group = Db.req(b, "group", "Nhóm món");
        if (!GROUPS.contains(group)) throw new OpsException(422, "BAD_GROUP", "Nhóm món không hợp lệ.");
        int pct = Db.reqInt(b, "discountPercent", "Mức giảm");
        if (pct < 1 || pct > 50) throw new OpsException(422, "BAD_PERCENT", "Mức giảm từ 1% đến 50%.");
        LocalDate from = date(b, "startDate", "Ngày bắt đầu"), to = date(b, "endDate", "Ngày kết thúc");
        if (from != null && to != null && to.isBefore(from)) throw new OpsException(422, "BAD_DATE", "Ngày kết thúc không được trước ngày bắt đầu.");
        LocalTime ds = time(b, "dailyStart", "Giờ bắt đầu"), de = time(b, "dailyEnd", "Giờ kết thúc");
        if (ds.equals(de)) throw new OpsException(422, "BAD_TIME", "Giờ bắt đầu và giờ kết thúc phải khác nhau.");
        return new Object[]{name, group, pct, from, to, ds, de};
    }

    public Map<String, Object> create(Map<String, Object> b) {
        Object[] p = parse(b);
        int id = db.insertId("""
                INSERT INTO promotion (name, item_group, discount_percent, start_date, end_date, daily_start, daily_end, active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)""", p[0], p[1], p[2], p[3], p[4], p[5], p[6], Db.nowUtc());
        return get(id);
    }

    public Map<String, Object> update(int id, Map<String, Object> b) {
        get(id);
        Object[] p = parse(b);
        db.jdbc.update("""
                UPDATE promotion SET name = ?, item_group = ?, discount_percent = ?, start_date = ?, end_date = ?, daily_start = ?, daily_end = ?
                WHERE promotion_id = ?""", p[0], p[1], p[2], p[3], p[4], p[5], p[6], id);
        return get(id);
    }

    /** Ngừng/kích hoạt lại. Dòng món đã chốt khuyến mãi không đổi (BR-019). */
    public Map<String, Object> setActive(int id, boolean active) {
        get(id);
        db.jdbc.update("UPDATE promotion SET active = ? WHERE promotion_id = ?", active, id);
        return get(id);
    }
}
