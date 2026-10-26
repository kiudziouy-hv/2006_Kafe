package vn.vtph.coffee.common;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Component;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.ops.OpsException;

/**
 * Tiện ích truy cập MySQL dùng chung cho các module quản trị (nhân sự, thực đơn, kho, hóa đơn, báo cáo...).
 * Thời điểm lưu theo UTC (cùng quy ước {@code JdbcOpsService}); khi trả JSON, mọi DATETIME được đổi sang {@link Instant}
 * để trình duyệt hiểu đúng múi giờ.
 */
@Component
@Profile("mysql")
public class Db {
    public final JdbcTemplate jdbc;
    public final ZoneId zone;

    public Db(JdbcTemplate jdbc, @Value("${vtph.timezone:Asia/Ho_Chi_Minh}") String timezone) {
        this.jdbc = jdbc;
        this.zone = ZoneId.of(timezone);
    }

    public static LocalDateTime nowUtc() { return LocalDateTime.now(ZoneOffset.UTC); }

    public LocalDate today() { return LocalDate.now(zone); }

    /** Độ lệch múi giờ dạng '+07:00' để dùng với CONVERT_TZ khi gom báo cáo theo ngày địa phương. */
    public String offset() {
        String id = zone.getRules().getOffset(Instant.now()).getId();
        return "Z".equals(id) ? "+00:00" : id;
    }

    public static Instant toInstant(LocalDateTime t) { return t == null ? null : t.toInstant(ZoneOffset.UTC); }

    public static LocalDateTime toUtc(Instant t) { return t == null ? null : LocalDateTime.ofInstant(t, ZoneOffset.UTC); }

    public <T> T one(String sql, RowMapper<T> mapper, Object... args) {
        List<T> r = jdbc.query(sql, mapper, args);
        return r.isEmpty() ? null : r.get(0);
    }

    public int insertId(String sql, Object... args) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < args.length; i++) ps.setObject(i + 1, args[i]);
            return ps;
        }, kh);
        return kh.getKey().intValue();
    }

    public int employeeId(Account a) {
        Integer id = one("SELECT employee_id FROM account WHERE account_id = ?", (rs, n) -> rs.getInt(1), a.id);
        if (id == null) throw new OpsException(404, "NO_EMPLOYEE", "Không tìm thấy nhân viên.");
        return id;
    }

    public List<Map<String, Object>> rows(String sql, Object... args) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : jdbc.queryForList(sql, args)) out.add(convert(r));
        return out;
    }

    public Map<String, Object> row(String sql, Object... args) {
        List<Map<String, Object>> r = rows(sql, args);
        return r.isEmpty() ? null : r.get(0);
    }

    public Map<String, Object> rowOr404(String sql, String code, String message, Object... args) {
        Map<String, Object> r = row(sql, args);
        if (r == null) throw new OpsException(404, code, message);
        return r;
    }

    private static Map<String, Object> convert(Map<String, Object> r) {
        Map<String, Object> m = new LinkedHashMap<>();
        r.forEach((k, v) -> m.put(k, v instanceof LocalDateTime t ? toInstant(t) : v));
        return m;
    }

    // ---- đọc dữ liệu từ JSON body ----
    public static String str(Map<String, Object> b, String key) {
        Object o = b == null ? null : b.get(key);
        return o == null ? null : String.valueOf(o).trim();
    }

    public static String req(Map<String, Object> b, String key, String label) {
        String s = str(b, key);
        if (s == null || s.isEmpty()) throw new OpsException(422, "REQUIRED", label + " là bắt buộc.");
        return s;
    }

    public static Integer integer(Map<String, Object> b, String key) {
        Object o = b == null ? null : b.get(key);
        if (o instanceof Number n) return n.intValue();
        if (o instanceof String s && s.matches("-?\\d+")) return Integer.parseInt(s);
        return null;
    }

    public static int reqInt(Map<String, Object> b, String key, String label) {
        Integer v = integer(b, key);
        if (v == null) throw new OpsException(422, "REQUIRED", label + " không hợp lệ.");
        return v;
    }

    public static java.math.BigDecimal decimal(Map<String, Object> b, String key, String label) {
        Object o = b == null ? null : b.get(key);
        try {
            if (o instanceof Number n) return new java.math.BigDecimal(n.toString());
            if (o instanceof String s && !s.isBlank()) return new java.math.BigDecimal(s.trim());
        } catch (NumberFormatException ignored) { /* rơi xuống lỗi bên dưới */ }
        throw new OpsException(422, "REQUIRED", label + " không hợp lệ.");
    }

    public static int round500(long amount) { return (int) (Math.floorDiv(amount + 250, 500) * 500); }
}
