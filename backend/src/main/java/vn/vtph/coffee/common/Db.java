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

    /** Khoảng ngày của bộ lọc: bắt đầu không sau kết thúc, không chọn ngày tương lai, dài tối đa {@code maxDays} ngày. */
    public void checkRange(LocalDate from, LocalDate to, int maxDays) {
        if (from.isAfter(to)) throw new OpsException(422, "BAD_RANGE", "Ngày bắt đầu không được sau ngày kết thúc.");
        if (to.isAfter(today())) throw new OpsException(422, "BAD_RANGE", "Không chọn ngày trong tương lai.");
        if (java.time.temporal.ChronoUnit.DAYS.between(from, to) > maxDays) throw new OpsException(422, "BAD_RANGE", "Khoảng thời gian tối đa " + maxDays + " ngày.");
    }

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

    /** Chuỗi bắt buộc, tối đa 255 ký tự (độ dài lớn nhất của các cột lý do/ghi chú). */
    public static String req(Map<String, Object> b, String key, String label) { return req(b, key, label, 255); }

    /** Chuỗi bắt buộc, tối đa {@code max} ký tự theo độ dài cột trong CSDL (tên 100, đơn vị 20...). */
    public static String req(Map<String, Object> b, String key, String label, int max) {
        String s = str(b, key);
        if (s == null || s.isEmpty()) throw new OpsException(422, "REQUIRED", label + " là bắt buộc.");
        if (s.length() > max) throw new OpsException(422, "TOO_LONG", label + " tối đa " + max + " ký tự.");
        return s;
    }

    /**
     * Số tiền/số lượng nguyên không âm, không vượt {@code max}; trả null nếu không gửi. Chặn số thập phân, số âm và số quá lớn
     * (tránh tràn int khi ép kiểu).
     */
    public static Integer money(Object o, String label, int max) {
        if (o == null) return null;
        java.math.BigDecimal v;
        try {
            v = o instanceof Number n ? new java.math.BigDecimal(n.toString()) : new java.math.BigDecimal(String.valueOf(o).trim());
        } catch (NumberFormatException e) {
            throw new OpsException(422, "BAD_NUMBER", label + " không hợp lệ.");
        }
        if (v.signum() < 0) throw new OpsException(422, "BAD_NUMBER", label + " không được âm.");
        if (v.stripTrailingZeros().scale() > 0) throw new OpsException(422, "BAD_NUMBER", label + " phải là số nguyên.");
        if (v.compareTo(java.math.BigDecimal.valueOf(max)) > 0)
            throw new OpsException(422, "BAD_NUMBER", label + " tối đa " + String.format(java.util.Locale.ROOT, "%,d", max).replace(',', '.') + ".");
        return v.intValueExact();
    }

    public static Integer integer(Map<String, Object> b, String key) {
        Object o = b == null ? null : b.get(key);
        if (o instanceof Number n) return n.intValue();
        if (o instanceof String s && s.matches("-?\\d{1,9}")) return Integer.parseInt(s);
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
}
