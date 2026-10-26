package vn.vtph.coffee.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** BR-042: sai PIN 5 lần liên tiếp thì khóa tạm 15 phút. Dữ liệu từ mock-accounts.json (tài khoản thử nghiệm). */
class AuthServiceTest {
    private AuthService auth;

    @BeforeEach
    void setUp() throws Exception {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
        InMemoryAccountStore store = new InMemoryAccountStore(encoder);
        store.load();
        auth = new AuthService(store, encoder, false);
    }

    @Test
    void waiterLogsInWithCorrectPin() {
        assertEquals(Role.WAITER, auth.loginStaff(2, "123456").role);
    }

    @Test
    void pinMustBeSixDigits() {
        AuthException e = assertThrows(AuthException.class, () -> auth.loginStaff(2, "12345"));
        assertEquals("INVALID_FORMAT", e.code);
    }

    @Test
    void ownerCannotUseStaffPinLogin() {
        assertEquals("NOT_FOUND", assertThrows(AuthException.class, () -> auth.loginStaff(1, "123456")).code);
    }

    @Test
    void fiveWrongPinsLockTheAccountEvenForTheCorrectPin() {
        for (int i = 1; i <= 4; i++) {
            AuthException e = assertThrows(AuthException.class, () -> auth.loginStaff(3, "000000"));
            assertEquals("WRONG_SECRET", e.code);
            assertEquals(5 - i, e.attemptsLeft);
        }
        assertEquals("LOCKED", assertThrows(AuthException.class, () -> auth.loginStaff(3, "000000")).code);
        assertEquals("LOCKED", assertThrows(AuthException.class, () -> auth.loginStaff(3, "234567")).code);
    }

    @Test
    void successfulLoginResetsTheFailureCounter() {
        assertThrows(AuthException.class, () -> auth.loginStaff(4, "000000"));
        auth.loginStaff(4, "345678");
        AuthException e = assertThrows(AuthException.class, () -> auth.loginStaff(4, "000000"));
        assertEquals(4, e.attemptsLeft);
    }

    @Test
    void ownerLogsInWithPassword() {
        assertEquals(Role.OWNER, auth.loginOwner("chuquan", "Quan@2026").role);
    }
}
