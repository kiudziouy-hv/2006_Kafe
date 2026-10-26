package vn.vtph.coffee.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcAccountRepository implements AccountRepository {

    private static final String SELECT = """
            SELECT a.account_id, a.employee_id, e.full_name, a.username, a.secret_hash,
                   a.role, a.status, a.failed_attempts, a.locked_until
              FROM account a
              JOIN employee e ON e.employee_id = a.employee_id
            """;

    private static final RowMapper<Account> MAPPER = JdbcAccountRepository::map;

    private final JdbcTemplate jdbc;

    public JdbcAccountRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static Account map(ResultSet rs, int rowNum) throws SQLException {
        Timestamp lockedUntil = rs.getTimestamp("locked_until");
        return new Account(
                rs.getLong("account_id"),
                rs.getLong("employee_id"),
                rs.getString("full_name"),
                rs.getString("username"),
                rs.getString("secret_hash"),
                Role.valueOf(rs.getString("role")),
                AccountStatus.valueOf(rs.getString("status")),
                rs.getInt("failed_attempts"),
                lockedUntil == null ? null : lockedUntil.toLocalDateTime());
    }

    @Override
    public Optional<Account> findByUsernameForUpdate(String username) {
        return jdbc.query(SELECT + " WHERE a.username = ? FOR UPDATE", MAPPER, username).stream().findFirst();
    }

    @Override
    public List<Account> findSelectableStaff() {
        return jdbc.query(SELECT + " WHERE a.role <> 'OWNER_MANAGER' AND a.status <> 'LOCKED' ORDER BY a.role, e.full_name", MAPPER);
    }

    @Override
    public void saveAttemptState(long accountId, int failedAttempts, AccountStatus status, LocalDateTime lockedUntil) {
        jdbc.update("UPDATE account SET failed_attempts = ?, status = ?, locked_until = ? WHERE account_id = ?",
                failedAttempts, status.name(), lockedUntil == null ? null : Timestamp.valueOf(lockedUntil), accountId);
    }

    @Override
    public void resetAttempts(long accountId) {
        // Không đụng tới tài khoản LOCKED (Chủ quán khóa): chỉ mở khóa tạm do nhập sai.
        jdbc.update("UPDATE account SET failed_attempts = 0, status = 'ACTIVE', locked_until = NULL "
                + "WHERE account_id = ? AND status <> 'LOCKED'", accountId);
    }

    @Override
    public void updateSecretHash(long accountId, String newHash) {
        jdbc.update("UPDATE account SET secret_hash = ? WHERE account_id = ?", newHash, accountId);
    }
}
