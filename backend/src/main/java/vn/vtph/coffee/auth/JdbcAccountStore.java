package vn.vtph.coffee.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

/**
 * Tài khoản trong MySQL (bảng account nối employee). Giờ khóa lưu theo UTC trong cột DATETIME.
 * Ràng buộc của lược đồ: TEMP_LOCKED bắt buộc có locked_until; failed_attempts tối đa 5 (BR-042).
 */
@Component
@Profile("mysql")
public class JdbcAccountStore implements AccountStore {
    private static final String SELECT = """
            SELECT a.account_id, a.username, a.secret_hash, a.role, a.status, a.failed_attempts, a.locked_until, a.is_station, e.full_name
            FROM account a JOIN employee e ON e.employee_id = a.employee_id""";

    private final JdbcTemplate jdbc;

    private final RowMapper<Account> mapper = (ResultSet rs, int row) -> map(rs);

    public JdbcAccountStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static Account map(ResultSet rs) throws SQLException {
        Account a = new Account(rs.getInt("account_id"), rs.getString("username"), rs.getString("full_name"),
                role(rs.getString("role")), rs.getString("secret_hash"));
        a.failedAttempts = rs.getInt("failed_attempts");
        LocalDateTime until = rs.getObject("locked_until", LocalDateTime.class);
        a.lockedUntil = until == null ? null : until.toInstant(ZoneOffset.UTC);
        a.permanentlyLocked = "LOCKED".equals(rs.getString("status"));
        a.station = rs.getBoolean("is_station");
        return a;
    }

    private static Role role(String db) {
        return switch (db) {
            case "OWNER_MANAGER" -> Role.OWNER;
            case "CASHIER" -> Role.CASHIER;
            case "WAITER" -> Role.WAITER;
            case "BARISTA" -> Role.BARISTA;
            default -> throw new IllegalStateException("Vai trò không biết: " + db);
        };
    }

    @Override
    public List<Account> all() {
        return jdbc.query(SELECT + " ORDER BY a.account_id", mapper);
    }

    @Override
    public Optional<Account> byId(int id) {
        return jdbc.query(SELECT + " WHERE a.account_id = ?", mapper, id).stream().findFirst();
    }

    @Override
    public Optional<Account> ownerByUsername(String username) {
        return jdbc.query(SELECT + " WHERE a.role = 'OWNER_MANAGER' AND a.username = ?", mapper, username).stream().findFirst();
    }

    @Override
    public boolean onDuty(Account a) {
        Integer n = jdbc.queryForObject("""
                SELECT COUNT(*) FROM attendance t JOIN account ac ON ac.employee_id = t.employee_id
                WHERE ac.account_id = ? AND t.check_out_time IS NULL""", Integer.class, a.id);
        return n != null && n > 0;
    }

    @Override
    public boolean anyOnDuty(Role role) {
        String db = switch (role) {
            case OWNER -> "OWNER_MANAGER";
            case CASHIER -> "CASHIER";
            case WAITER -> "WAITER";
            case BARISTA -> "BARISTA";
        };
        Integer n = jdbc.queryForObject("""
                SELECT COUNT(*) FROM attendance t JOIN account ac ON ac.employee_id = t.employee_id
                WHERE ac.role = ? AND ac.is_station = 0 AND t.check_out_time IS NULL""", Integer.class, db);
        return n != null && n > 0;
    }

    @Override
    public void saveLockState(Account a) {
        if (a.permanentlyLocked) return; // khóa hẳn do Chủ quán đặt, đăng nhập không đổi được
        Instant until = a.lockedUntil;
        jdbc.update("UPDATE account SET failed_attempts = ?, locked_until = ?, status = ? WHERE account_id = ?",
                a.failedAttempts, until == null ? null : LocalDateTime.ofInstant(until, ZoneOffset.UTC),
                until == null ? "ACTIVE" : "TEMP_LOCKED", a.id);
    }

    @Override
    public void saveHash(Account a) {
        jdbc.update("UPDATE account SET secret_hash = ? WHERE account_id = ?", a.secretHash, a.id);
    }
}
