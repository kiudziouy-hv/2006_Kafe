package vn.vtph.coffee.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.vtph.coffee.common.BusinessException;
import vn.vtph.coffee.config.AuthProperties;
import vn.vtph.coffee.config.JwtProperties;

class AuthServiceTest {

    private static final String SECRET = "0123456789-0123456789-0123456789-xx";

    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private MutableClock clock;
    private FakeAccounts repo;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-10-26T07:00:00Z"));
        repo = new FakeAccounts();
    }

    private AuthService service(boolean acceptLegacy) {
        AuthProperties props = new AuthProperties(5, 15, acceptLegacy);
        JwtService jwt = new JwtService(new JwtProperties(SECRET, 600), clock);
        return new AuthService(repo, encoder, jwt, props, clock);
    }

    private void addAccount(String username, String secretHash, AccountStatus status) {
        repo.accounts.put(username, new Account(1, 10, "Nhân viên mẫu", username, secretHash, Role.WAITER, status, 0, null));
    }

    private static BusinessException loginFails(AuthService s, String user, String pin) {
        return assertThrows(BusinessException.class, () -> s.login(user, pin));
    }

    @Test
    void correctPinReturnsTokenAndResetsCounter() {
        addAccount("phucvu1", encoder.encode("123456"), AccountStatus.ACTIVE);
        AuthService s = service(false);
        loginFails(s, "phucvu1", "000000");
        assertEquals(1, repo.accounts.get("phucvu1").failedAttempts());

        AuthService.LoginResult r = s.login("phucvu1", "123456");
        assertNotNull(r.token());
        assertEquals(Role.WAITER, r.account().role());
        assertEquals(0, repo.accounts.get("phucvu1").failedAttempts());
    }

    @Test
    void unknownUserGetsGenericError() {
        BusinessException e = loginFails(service(false), "khongco", "123456");
        assertEquals(HttpStatus.UNAUTHORIZED, e.status());
        assertEquals("BAD_CREDENTIALS", e.code());
    }

    @Test
    void fifthWrongPinLocksFor15MinutesEvenForCorrectPin() {
        addAccount("phucvu1", encoder.encode("123456"), AccountStatus.ACTIVE);
        AuthService s = service(false);
        for (int i = 1; i <= 4; i++) {
            assertEquals(HttpStatus.UNAUTHORIZED, loginFails(s, "phucvu1", "000000").status());
        }
        BusinessException fifth = loginFails(s, "phucvu1", "000000");
        assertEquals(HttpStatus.LOCKED, fifth.status());
        assertEquals("ACCOUNT_TEMP_LOCKED", fifth.code());

        Account acc = repo.accounts.get("phucvu1");
        assertEquals(AccountStatus.TEMP_LOCKED, acc.status());
        assertEquals(5, acc.failedAttempts()); // ck_account_attempts: <= 5
        assertEquals(LocalDateTime.now(clock).plusMinutes(15), acc.lockedUntil());

        clock.advance(Duration.ofMinutes(14));
        assertEquals("ACCOUNT_TEMP_LOCKED", loginFails(s, "phucvu1", "123456").code());
    }

    @Test
    void lockExpiresAfter15MinutesAndCorrectPinWorks() {
        addAccount("phucvu1", encoder.encode("123456"), AccountStatus.ACTIVE);
        AuthService s = service(false);
        for (int i = 0; i < 5; i++) {
            loginFails(s, "phucvu1", "000000");
        }
        clock.advance(Duration.ofMinutes(15).plusSeconds(1));
        assertNotNull(s.login("phucvu1", "123456").token());
        Account acc = repo.accounts.get("phucvu1");
        assertEquals(AccountStatus.ACTIVE, acc.status());
        assertEquals(0, acc.failedAttempts());
    }

    @Test
    void wrongPinAfterExpiredLockStartsCountingAgainFromOne() {
        addAccount("phucvu1", encoder.encode("123456"), AccountStatus.ACTIVE);
        AuthService s = service(false);
        for (int i = 0; i < 5; i++) {
            loginFails(s, "phucvu1", "000000");
        }
        clock.advance(Duration.ofMinutes(16));
        assertEquals(HttpStatus.UNAUTHORIZED, loginFails(s, "phucvu1", "000000").status());
        Account acc = repo.accounts.get("phucvu1");
        assertEquals(AccountStatus.ACTIVE, acc.status());
        assertEquals(1, acc.failedAttempts());
    }

    @Test
    void permanentlyLockedAccountIsRejected() {
        addAccount("phucvu1", encoder.encode("123456"), AccountStatus.LOCKED);
        BusinessException e = loginFails(service(false), "phucvu1", "123456");
        assertEquals("ACCOUNT_LOCKED", e.code());
    }

    @Test
    void legacyDemoHashIsRejectedUnlessEnabled() {
        String legacy = Sha.sha256Hex("demo-phucvu1-123456");
        addAccount("phucvu1", legacy, AccountStatus.ACTIVE);
        assertEquals("BAD_CREDENTIALS", loginFails(service(false), "phucvu1", "123456").code());
    }

    @Test
    void legacyDemoHashIsUpgradedToBcryptWhenEnabled() {
        String legacy = Sha.sha256Hex("demo-phucvu1-123456");
        addAccount("phucvu1", legacy, AccountStatus.ACTIVE);
        assertNotNull(service(true).login("phucvu1", "123456").token());

        String stored = repo.accounts.get("phucvu1").secretHash();
        assertTrue(stored.startsWith("$2"), "hash phải được nâng lên BCrypt");
        assertTrue(encoder.matches("123456", stored));
        // lần sau đăng nhập bằng BCrypt, kể cả khi đã tắt chế độ hash demo
        assertNotNull(service(false).login("phucvu1", "123456").token());
    }

    // ---- test doubles ------------------------------------------------------

    static class FakeAccounts implements AccountRepository {
        final Map<String, Account> accounts = new HashMap<>();

        @Override
        public Optional<Account> findByUsernameForUpdate(String username) {
            return Optional.ofNullable(accounts.get(username));
        }

        @Override
        public List<Account> findSelectableStaff() {
            return accounts.values().stream().filter(a -> a.role() != Role.OWNER_MANAGER).toList();
        }

        @Override
        public void saveAttemptState(long id, int failed, AccountStatus status, LocalDateTime until) {
            replace(id, a -> new Account(a.accountId(), a.employeeId(), a.fullName(), a.username(), a.secretHash(),
                    a.role(), status, failed, until));
        }

        @Override
        public void resetAttempts(long id) {
            replace(id, a -> a.status() == AccountStatus.LOCKED ? a : new Account(a.accountId(), a.employeeId(),
                    a.fullName(), a.username(), a.secretHash(), a.role(), AccountStatus.ACTIVE, 0, null));
        }

        @Override
        public void updateSecretHash(long id, String hash) {
            replace(id, a -> new Account(a.accountId(), a.employeeId(), a.fullName(), a.username(), hash,
                    a.role(), a.status(), a.failedAttempts(), a.lockedUntil()));
        }

        private void replace(long id, java.util.function.UnaryOperator<Account> f) {
            accounts.replaceAll((k, v) -> v.accountId() == id ? f.apply(v) : v);
        }
    }

    static class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant start) {
            this.now = start;
        }

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    static final class Sha {
        static String sha256Hex(String s) {
            try {
                byte[] d = java.security.MessageDigest.getInstance("SHA-256")
                        .digest(s.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                return java.util.HexFormat.of().formatHex(d);
            } catch (java.security.NoSuchAlgorithmException e) {
                throw new IllegalStateException(e);
            }
        }
    }
}
