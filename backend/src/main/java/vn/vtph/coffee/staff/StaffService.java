package vn.vtph.coffee.staff;

import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.common.Db;
import vn.vtph.coffee.ops.OpsException;

/** UC-03 cập nhật thông tin cá nhân; UC-04 quản lý nhân viên và tài khoản (FR-M01-007..013, BR-042). */
@Service
@Profile("mysql")
@Transactional
public class StaffService {
    private static final List<String> STAFF_ROLES = List.of("CASHIER", "WAITER", "BARISTA");
    private final Db db;
    private final PasswordEncoder encoder;

    public StaffService(Db db, PasswordEncoder encoder) {
        this.db = db;
        this.encoder = encoder;
    }

    private static final String LIST_SQL = """
            SELECT e.employee_id AS id, a.account_id AS accountId, e.full_name AS fullName, e.phone, e.email, a.username,
                   a.role, a.is_station AS station, CASE WHEN a.status = 'TEMP_LOCKED' AND a.locked_until <= UTC_TIMESTAMP() THEN 'ACTIVE' ELSE a.status END AS status
            FROM employee e JOIN account a ON a.employee_id = e.employee_id""";

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list() {
        return db.rows(LIST_SQL + " ORDER BY FIELD(a.role,'OWNER_MANAGER','CASHIER','WAITER','BARISTA'), e.employee_id");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> me(Account a) {
        return db.rowOr404(LIST_SQL + " WHERE a.account_id = ?", "NO_EMPLOYEE", "Không tìm thấy nhân viên.", a.id);
    }

    private static void validateContact(String phone, String email) {
        if (phone != null && !phone.isEmpty() && !phone.matches("0\\d{9}"))
            throw new OpsException(422, "BAD_PHONE", "Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.");
        if (email != null && email.length() > 120) throw new OpsException(422, "TOO_LONG", "Email tối đa 120 ký tự.");
        if (email != null && !email.isEmpty() && !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+"))
            throw new OpsException(422, "BAD_EMAIL", "Email không hợp lệ.");
    }

    private static String blankToNull(String s) { return s == null || s.isEmpty() ? null : s; }

    public Map<String, Object> updateMe(Account a, Map<String, Object> b) {
        String name = Db.req(b, "fullName", "Họ tên", 100);
        String phone = Db.str(b, "phone"), email = Db.str(b, "email");
        validateContact(phone, email);
        db.jdbc.update("UPDATE employee SET full_name = ?, phone = ?, email = ? WHERE employee_id = ?",
                name, blankToNull(phone), blankToNull(email), db.employeeId(a));
        return me(a);
    }

    private static void validateSecret(String role, String secret) {
        if ("OWNER_MANAGER".equals(role)) {
            if (secret == null || secret.length() < 8) throw new OpsException(422, "BAD_SECRET", "Mật khẩu tối thiểu 8 ký tự.");
        } else if (secret == null || !secret.matches("\\d{6}")) {
            throw new OpsException(422, "BAD_SECRET", "Mã PIN gồm đúng 6 chữ số.");
        }
    }

    /** Thêm nhân viên cùng tài khoản Hoạt động; tên đăng nhập sinh theo mã nhân viên (nhân viên đăng nhập bằng PIN nên không cần nhớ). */
    public Map<String, Object> create(Map<String, Object> b) {
        String name = Db.req(b, "fullName", "Họ tên", 100);
        String role = Db.req(b, "role", "Vai trò");
        if (!STAFF_ROLES.contains(role)) throw new OpsException(422, "BAD_ROLE", "Vai trò phải là Thu ngân, Phục vụ hoặc Pha chế.");
        String phone = Db.str(b, "phone"), email = Db.str(b, "email"), secret = Db.str(b, "secret");
        validateContact(phone, email);
        validateSecret(role, secret);
        int emp = db.insertId("INSERT INTO employee (full_name, phone, email) VALUES (?, ?, ?)", name, blankToNull(phone), blankToNull(email));
        String username = "nv" + emp;
        db.jdbc.update("INSERT INTO account (employee_id, username, secret_hash, role) VALUES (?, ?, ?, ?)", emp, username, encoder.encode(secret), role);
        return byEmployee(emp);
    }

    private Map<String, Object> byEmployee(int emp) {
        return db.rowOr404(LIST_SQL + " WHERE e.employee_id = ?", "NO_EMPLOYEE", "Không tìm thấy nhân viên.", emp);
    }

    public Map<String, Object> update(int emp, Map<String, Object> b) {
        Map<String, Object> cur = byEmployee(emp);
        String name = Db.req(b, "fullName", "Họ tên", 100);
        String phone = Db.str(b, "phone"), email = Db.str(b, "email");
        validateContact(phone, email);
        db.jdbc.update("UPDATE employee SET full_name = ?, phone = ?, email = ? WHERE employee_id = ?", name, blankToNull(phone), blankToNull(email), emp);
        String role = Db.str(b, "role");
        if (role != null && !role.equals(cur.get("role")) && !"OWNER_MANAGER".equals(cur.get("role"))) {
            if (!STAFF_ROLES.contains(role)) throw new OpsException(422, "BAD_ROLE", "Vai trò không hợp lệ.");
            db.jdbc.update("UPDATE account SET role = ? WHERE employee_id = ?", role, emp);
        }
        return byEmployee(emp);
    }

    /** Khóa tài khoản khi nhân viên nghỉ việc (không xóa, BR-042) hoặc mở khóa; mở khóa cũng xóa bộ đếm nhập sai. */
    public Map<String, Object> setLocked(int emp, boolean locked, Account by) {
        Map<String, Object> cur = byEmployee(emp);
        if (((Number) cur.get("accountId")).intValue() == by.id) throw new OpsException(409, "SELF_LOCK", "Không thể tự khóa tài khoản đang đăng nhập.");
        if (locked) db.jdbc.update("UPDATE account SET status = 'LOCKED', locked_until = NULL WHERE employee_id = ?", emp);
        else db.jdbc.update("UPDATE account SET status = 'ACTIVE', failed_attempts = 0, locked_until = NULL WHERE employee_id = ?", emp);
        return byEmployee(emp);
    }

    public Map<String, Object> resetSecret(int emp, String secret) {
        Map<String, Object> cur = byEmployee(emp);
        validateSecret((String) cur.get("role"), secret);
        db.jdbc.update("UPDATE account SET secret_hash = ?, failed_attempts = 0, status = IF(status = 'TEMP_LOCKED', 'ACTIVE', status), locked_until = NULL WHERE employee_id = ?",
                encoder.encode(secret), emp);
        return byEmployee(emp);
    }
}
