package vn.vtph.coffee.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.vtph.coffee.support.AbstractMySqlIT;

/** Chạy thật trên MySQL 8.4: Flyway dựng lược đồ Chương 5 + dữ liệu mẫu, rồi kiểm tra đăng nhập theo bảng account/employee. */
class MySqlAuthIntegrationTest extends AbstractMySqlIT {
    @Autowired AuthService auth;
    @Autowired JdbcTemplate jdbc;

    /** Dữ liệu mẫu: account 4 = phucvu1 (Phục vụ), 2 = thungan1 (Thu ngân), 7 = phache1; PIN: Phục vụ 123456, Lê Hoàng Cường34567, Pha chế 345678; chủ quán owner/admin123. */
    @BeforeEach
    void resetLocks() {
        jdbc.update("UPDATE account SET failed_attempts = 0, locked_until = NULL, status = 'ACTIVE'");
    }

    @Test
    void flywayBuiltTheWholeSchemaAndSeed() {
        assertEquals(28, jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' AND table_name <> 'flyway_schema_history'", Integer.class));
        assertEquals(15, jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = DATABASE()", Integer.class));
        assertEquals(11, jdbc.queryForObject("SELECT COUNT(*) FROM account", Integer.class));
        assertEquals(6, jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE success = 1", Integer.class));
        assertEquals("utf8mb4_0900_as_ci", jdbc.queryForObject("SELECT @@collation_database", String.class));
    }

    @Test
    void staffListComesFromTheDatabaseWithoutTheOwner() {
        List<Map<String, Object>> staff = auth.staffList();
        assertEquals(10, staff.size()); // 7 nhân viên + 3 tài khoản dùng chung (thu ngân, pha chế, phục vụ)
        assertTrue(staff.stream().noneMatch(m -> "OWNER".equals(m.get("role"))));
        assertTrue(staff.stream().anyMatch(m -> "Võ Tấn Phát".equals(m.get("fullName")) && "WAITER".equals(m.get("role"))));
    }

    @Test
    void everyRoleCanLogInWithItsSharedStationPin() {
        List<Map<String, Object>> stations = auth.staffList().stream().filter(m -> Boolean.TRUE.equals(m.get("station"))).toList();
        assertEquals(List.of("CASHIER", "BARISTA", "WAITER"), stations.stream().map(m -> m.get("role")).toList());
        Account cashier = auth.loginStaff(9, "234567");
        assertEquals(Role.CASHIER, cashier.role);
        assertTrue(cashier.station);
        assertEquals(Role.BARISTA, auth.loginStaff(10, "345678").role);
        Account waiter = auth.loginStaff(11, "123456");
        assertEquals(Role.WAITER, waiter.role);
        assertTrue(waiter.station);
        assertEquals("WRONG_SECRET", assertThrows(AuthException.class, () -> auth.loginStaff(9, "111111")).code);
    }

    @Test
    void theSharedPinsOfTheThreeRolesAreDifferent() {
        // Một PIN dùng chung cho cả ba vai trò sẽ cho người này vào tài khoản của vai trò khác (nâng quyền).
        assertEquals("WRONG_SECRET", assertThrows(AuthException.class, () -> auth.loginStaff(11, "234567")).code); // PIN thu ngân vào tài khoản phục vụ
        assertEquals("WRONG_SECRET", assertThrows(AuthException.class, () -> auth.loginStaff(9, "345678")).code); // PIN pha chế vào tài khoản thu ngân
        assertEquals("WRONG_SECRET", assertThrows(AuthException.class, () -> auth.loginStaff(10, "123456")).code); // PIN phục vụ vào tài khoản pha chế
    }

    @Test
    void eachRoleHasItsOwnSeedPin() {
        assertEquals(Role.WAITER, auth.loginStaff(5, "123456").role);
        assertEquals(Role.CASHIER, auth.loginStaff(3, "456789").role);
        assertEquals(Role.BARISTA, auth.loginStaff(8, "345678").role);
        assertEquals("WRONG_SECRET", assertThrows(AuthException.class, () -> auth.loginStaff(3, "123456")).code);
    }

    @Test
    void seedHashIsUpgradedToBcryptOnFirstSuccessfulLogin() {
        // Container MySQL dùng chung giữa các lớp test: test khác có thể đã nâng hash tài khoản 4 lên bcrypt, nên đặt lại hash seed.
        jdbc.update("UPDATE account SET secret_hash = SHA2(CONCAT('demo-','phucvu1','-','123456'),256) WHERE account_id = 4");
        assertEquals(64, jdbc.queryForObject("SELECT LENGTH(secret_hash) FROM account WHERE account_id = 4", Integer.class));
        assertEquals(Role.WAITER, auth.loginStaff(4, "123456").role);
        String hash = jdbc.queryForObject("SELECT secret_hash FROM account WHERE account_id = 4", String.class);
        assertTrue(hash.startsWith("$2"), hash);
        assertEquals(Role.WAITER, auth.loginStaff(4, "123456").role); // lần sau xác thực bằng bcrypt
    }

    @Test
    void ownerLogsInWithPasswordAndRoleIsMapped() {
        assertEquals(Role.OWNER, auth.loginOwner("owner", "admin123").role);
        assertEquals("BAD_CREDENTIALS", assertThrows(AuthException.class, () -> auth.loginOwner("nobody", "x")).code);
    }

    @Test
    void fiveWrongPinsPersistATemporaryLockInTheDatabase() {
        for (int i = 1; i <= 4; i++) {
            AuthException e = assertThrows(AuthException.class, () -> auth.loginStaff(2, "000000"));
            assertEquals("WRONG_SECRET", e.code);
        }
        assertEquals(4, jdbc.queryForObject("SELECT failed_attempts FROM account WHERE account_id = 2", Integer.class));
        assertEquals("LOCKED", assertThrows(AuthException.class, () -> auth.loginStaff(2, "000000")).code);
        Map<String, Object> row = jdbc.queryForMap("SELECT status, failed_attempts, locked_until FROM account WHERE account_id = 2");
        assertEquals("TEMP_LOCKED", row.get("status"));
        assertEquals(5, ((Number) row.get("failed_attempts")).intValue());
        assertNotNull(row.get("locked_until"));
        // đúng PIN cũng không vào được khi đang khóa
        assertEquals("LOCKED", assertThrows(AuthException.class, () -> auth.loginStaff(2, "123456")).code);
        assertTrue(auth.staffList().stream().filter(m -> m.get("id").equals(2)).allMatch(m -> Boolean.TRUE.equals(m.get("locked"))));
    }

    @Test
    void lockExpiresByItselfAndResetsTheRow() {
        for (int i = 0; i < 5; i++) assertThrows(AuthException.class, () -> auth.loginStaff(7, "000000"));
        jdbc.update("UPDATE account SET locked_until = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE account_id = 7"); // giả lập qua 15 phút
        assertEquals(Role.BARISTA, auth.loginStaff(7, "345678").role);
        Map<String, Object> row = jdbc.queryForMap("SELECT status, failed_attempts, locked_until FROM account WHERE account_id = 7");
        assertEquals("ACTIVE", row.get("status"));
        assertEquals(0, ((Number) row.get("failed_attempts")).intValue());
        assertNull(row.get("locked_until"));
    }

    @Test
    void successfulLoginClearsEarlierFailures() {
        assertThrows(AuthException.class, () -> auth.loginStaff(5, "000000"));
        assertThrows(AuthException.class, () -> auth.loginStaff(5, "000000"));
        auth.loginStaff(5, "123456");
        assertEquals(0, jdbc.queryForObject("SELECT failed_attempts FROM account WHERE account_id = 5", Integer.class));
    }

    @Test
    void permanentlyLockedAccountIsRefusedAndNotChangedByLogin() {
        jdbc.update("UPDATE account SET status = 'LOCKED' WHERE account_id = 6");
        assertEquals("ACCOUNT_LOCKED", assertThrows(AuthException.class, () -> auth.loginStaff(6, "123456")).code);
        assertEquals("LOCKED", jdbc.queryForObject("SELECT status FROM account WHERE account_id = 6", String.class));
    }
}
