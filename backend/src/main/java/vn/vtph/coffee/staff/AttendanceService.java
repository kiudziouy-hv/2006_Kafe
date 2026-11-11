package vn.vtph.coffee.staff;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.auth.AuthService;
import vn.vtph.coffee.common.Db;
import vn.vtph.coffee.ops.OpsException;

/**
 * UC-28 chấm công vào/ra bằng PIN tại máy quầy (không mở/đóng phiên ca thu ngân, ASM-17);
 * UC-29 Chủ quán/Quản lý chỉnh sửa hoặc thêm bản ghi, mỗi lần lưu lịch sử trước/sau (BR-039).
 */
@Service
@Profile("mysql")
@Transactional
public class AttendanceService {
    private static final List<String> SHIFTS = List.of("MORNING", "EVENING");
    private final Db db;
    private final AuthService auth;

    public AttendanceService(Db db, AuthService auth) {
        this.db = db;
        this.auth = auth;
    }

    private static final String LIST_SQL = """
            SELECT a.attendance_id AS id, a.employee_id AS employeeId, e.full_name AS fullName, a.shift,
                   a.check_in_time AS checkIn, a.check_out_time AS checkOut,
                   (SELECT COUNT(*) FROM attendance_edit x WHERE x.attendance_id = a.attendance_id) AS edits
            FROM attendance a JOIN employee e ON e.employee_id = a.employee_id""";

    /** Chấm công cần tài khoản cá nhân: tài khoản quầy dùng chung không xác định được người chấm công. */
    private static Account personal(Account a) {
        if (a.station) throw new OpsException(422, "STATION_ACCOUNT", "Tài khoản quầy dùng chung không chấm công. Hãy chọn tài khoản cá nhân của bạn.");
        return a;
    }

    private int employeeOf(Account a) { return db.employeeId(a); }

    /** Người chấm công chọn vai trò rồi tên; tên không thuộc vai trò đã chọn thì từ chối trước khi kiểm tra PIN (không tính lần nhập sai). */
    private void requireRole(int accountId, String role) {
        if (role == null || role.isEmpty()) return;
        Account a = auth.find(accountId);
        if (a != null && !a.role.name().equals(role))
            throw new OpsException(422, "WRONG_ROLE", "Nhân viên này không thuộc vai trò đã chọn. Hãy chọn đúng vai trò và tên của bạn.");
    }

    public Map<String, Object> checkIn(int accountId, String pin, String shift) { return checkIn(accountId, pin, shift, null); }

    public Map<String, Object> checkOut(int accountId, String pin) { return checkOut(accountId, pin, null); }

    public Map<String, Object> checkIn(int accountId, String pin, String shift, String role) {
        if (!SHIFTS.contains(shift)) throw new OpsException(422, "BAD_SHIFT", "Chọn ca sáng hoặc ca tối.");
        requireRole(accountId, role);
        return clockIn(personal(auth.loginStaff(accountId, pin)), shift);
    }

    public Map<String, Object> checkOut(int accountId, String pin, String role) {
        requireRole(accountId, role);
        return clockOut(personal(auth.loginStaff(accountId, pin)));
    }

    /** Chủ quán/Quản lý đã đăng nhập bằng mật khẩu nên tự chấm công vào/ra không cần PIN. */
    public Map<String, Object> checkInSelf(Account a, String shift) {
        if (!SHIFTS.contains(shift)) throw new OpsException(422, "BAD_SHIFT", "Chọn ca sáng hoặc ca tối.");
        return clockIn(a, shift);
    }

    public Map<String, Object> checkOutSelf(Account a) { return clockOut(a); }

    /** Bản ghi chấm công đang mở (chưa ra) của chính người đăng nhập, hoặc rỗng. */
    @Transactional(readOnly = true)
    public Map<String, Object> mine(Account a) {
        List<Map<String, Object>> r = db.rows(LIST_SQL + " WHERE a.employee_id = ? AND a.check_out_time IS NULL ORDER BY a.check_in_time DESC LIMIT 1", employeeOf(a));
        return r.isEmpty() ? Map.of() : r.get(0);
    }

    private Map<String, Object> clockIn(Account a, String shift) {
        int emp = employeeOf(a);
        if (!db.jdbc.queryForList("SELECT 1 FROM attendance WHERE employee_id = ? AND check_out_time IS NULL", emp).isEmpty())
            throw new OpsException(409, "ALREADY_IN", "Bạn đã chấm công vào và chưa chấm công ra. Hãy chấm công ra hoặc nhờ Chủ quán/Quản lý chỉnh sửa.");
        int id = db.insertId("INSERT INTO attendance (employee_id, shift, check_in_time) VALUES (?, ?, ?)", emp, shift, Db.nowUtc());
        return Map.of("id", id, "fullName", a.fullName, "shift", shift, "at", Instant.now().toString());
    }

    private Map<String, Object> clockOut(Account a) {
        int emp = employeeOf(a);
        Integer id = db.one("SELECT attendance_id FROM attendance WHERE employee_id = ? AND check_out_time IS NULL ORDER BY check_in_time DESC LIMIT 1",
                (rs, n) -> rs.getInt(1), emp);
        if (id == null) throw new OpsException(409, "NOT_IN", "Bạn chưa chấm công vào.");
        db.jdbc.update("UPDATE attendance SET check_out_time = ? WHERE attendance_id = ?", Db.nowUtc(), id);
        return Map.of("id", id, "fullName", a.fullName, "at", Instant.now().toString());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(LocalDate from, LocalDate to, Integer employeeId) {
        LocalDate f = from == null ? db.today().minusDays(6) : from, t = to == null ? db.today() : to;
        db.checkRange(f, t, 366);
        LocalDateTime lo = f.atStartOfDay(db.zone).toInstant().atZone(java.time.ZoneOffset.UTC).toLocalDateTime();
        LocalDateTime hi = t.plusDays(1).atStartOfDay(db.zone).toInstant().atZone(java.time.ZoneOffset.UTC).toLocalDateTime();
        String sql = LIST_SQL + " WHERE a.check_in_time >= ? AND a.check_in_time < ?" + (employeeId == null ? "" : " AND a.employee_id = ?")
                + " ORDER BY a.check_in_time DESC";
        return employeeId == null ? db.rows(sql, lo, hi) : db.rows(sql, lo, hi, employeeId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> history(int attendanceId) {
        return db.rows("""
                SELECT x.edit_id AS id, e.full_name AS editedBy, x.edited_at AS editedAt, x.old_value AS oldValue, x.new_value AS newValue
                FROM attendance_edit x JOIN employee e ON e.employee_id = x.edited_by WHERE x.attendance_id = ? ORDER BY x.edit_id DESC""", attendanceId);
    }

    private void ensureDayOpen(LocalDateTime utc) {
        LocalDate day = Db.toInstant(utc).atZone(db.zone).toLocalDate();
        String st = db.one("SELECT status FROM business_day WHERE business_date = ?", (rs, n) -> rs.getString(1), day);
        if ("CLOSED".equals(st)) throw new OpsException(409, "DAY_CLOSED", "Ngày " + day + " đã chốt, không chỉnh sửa chấm công.");
    }

    private static LocalDateTime parse(String s, String label) {
        try {
            return Db.toUtc(Instant.parse(s));
        } catch (Exception e) {
            throw new OpsException(422, "BAD_TIME", label + " không hợp lệ.");
        }
    }

    private static String describe(String shift, LocalDateTime in, LocalDateTime out) {
        return "ca=" + shift + "; vào=" + (in == null ? "-" : Db.toInstant(in)) + "; ra=" + (out == null ? "-" : Db.toInstant(out));
    }

    public Map<String, Object> edit(int id, Map<String, Object> b, Account by) {
        Map<String, Object> cur = db.one("SELECT shift, check_in_time, check_out_time FROM attendance WHERE attendance_id = ? FOR UPDATE",
                (rs, n) -> Map.<String, Object>of("shift", rs.getString(1), "in", rs.getObject(2, LocalDateTime.class),
                        "out", java.util.Optional.ofNullable(rs.getObject(3, LocalDateTime.class))), id);
        if (cur == null) throw new OpsException(404, "NO_ATTENDANCE", "Không tìm thấy bản ghi chấm công.");
        LocalDateTime oldIn = (LocalDateTime) cur.get("in");
        LocalDateTime oldOut = ((java.util.Optional<LocalDateTime>) cur.get("out")).orElse(null);
        String shift = Db.str(b, "shift") == null ? (String) cur.get("shift") : Db.str(b, "shift");
        if (!SHIFTS.contains(shift)) throw new OpsException(422, "BAD_SHIFT", "Ca không hợp lệ.");
        LocalDateTime in = Db.str(b, "checkIn") == null ? oldIn : parse(Db.str(b, "checkIn"), "Giờ vào");
        String outRaw = Db.str(b, "checkOut");
        LocalDateTime out = b.containsKey("checkOut") ? (outRaw == null || outRaw.isEmpty() ? null : parse(outRaw, "Giờ ra")) : oldOut;
        if (out != null && out.isBefore(in)) throw new OpsException(422, "BAD_TIME", "Giờ ra không được trước giờ vào.");
        ensureDayOpen(oldIn);
        ensureDayOpen(in);
        String before = describe((String) cur.get("shift"), oldIn, oldOut), after = describe(shift, in, out);
        if (before.equals(after)) throw new OpsException(422, "NO_CHANGE", "Chưa có thay đổi nào.");
        db.jdbc.update("UPDATE attendance SET shift = ?, check_in_time = ?, check_out_time = ? WHERE attendance_id = ?", shift, in, out, id);
        db.jdbc.update("INSERT INTO attendance_edit (attendance_id, edited_by, edited_at, old_value, new_value) VALUES (?, ?, ?, ?, ?)",
                id, db.employeeId(by), Db.nowUtc(), before, after);
        return db.row(LIST_SQL + " WHERE a.attendance_id = ?", id);
    }

    /** Bổ sung bản ghi khi nhân viên không chấm công (luồng thay thế 3a). */
    public Map<String, Object> add(Map<String, Object> b, Account by) {
        int emp = Db.reqInt(b, "employeeId", "Nhân viên");
        String shift = Db.req(b, "shift", "Ca");
        if (!SHIFTS.contains(shift)) throw new OpsException(422, "BAD_SHIFT", "Ca không hợp lệ.");
        LocalDateTime in = parse(Db.req(b, "checkIn", "Giờ vào"), "Giờ vào");
        String outRaw = Db.str(b, "checkOut");
        LocalDateTime out = outRaw == null || outRaw.isEmpty() ? null : parse(outRaw, "Giờ ra");
        if (out != null && out.isBefore(in)) throw new OpsException(422, "BAD_TIME", "Giờ ra không được trước giờ vào.");
        if (db.jdbc.queryForList("SELECT 1 FROM employee WHERE employee_id = ?", emp).isEmpty()) throw new OpsException(404, "NO_EMPLOYEE", "Không tìm thấy nhân viên.");
        ensureDayOpen(in);
        int id = db.insertId("INSERT INTO attendance (employee_id, shift, check_in_time, check_out_time) VALUES (?, ?, ?, ?)", emp, shift, in, out);
        db.jdbc.update("INSERT INTO attendance_edit (attendance_id, edited_by, edited_at, old_value, new_value) VALUES (?, ?, ?, ?, ?)",
                id, db.employeeId(by), Db.nowUtc(), "(thêm mới)", describe(shift, in, out));
        return db.row(LIST_SQL + " WHERE a.attendance_id = ?", id);
    }
}
