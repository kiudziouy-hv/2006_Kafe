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

    /** Kho tài khoản giả lập có chấm công: chỉ những tài khoản/vai trò trong tập "on" được coi là đang chấm công. */
    private AuthService withAttendance(java.util.Set<Integer> personalOn, java.util.Set<Role> rolesOn) throws Exception {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
        InMemoryAccountStore store = new InMemoryAccountStore(encoder) {
            @Override public boolean onDuty(Account a) { return personalOn.contains(a.id); }
            @Override public boolean anyOnDuty(Role r) { return rolesOn.contains(r); }
        };
        store.load();
        return new AuthService(store, encoder, false);
    }

    @Test
    void personalAccountNeedsOwnCheckIn() throws Exception {
        AuthService s = withAttendance(java.util.Set.of(), java.util.Set.of());
        Account waiter = s.loginStaff(2, "123456"); // PIN đúng nhưng chưa chấm công
        assertEquals("NOT_CHECKED_IN", assertThrows(AuthException.class, () -> s.requireOnDuty(waiter)).code);
        AuthService checkedIn = withAttendance(java.util.Set.of(2), java.util.Set.of());
        checkedIn.requireOnDuty(checkedIn.loginStaff(2, "123456"));
    }

    @Test
    void stationAccountNeedsSomeoneOfTheRoleCheckedIn() throws Exception {
        Account station = new Account(99, "quay", "Quầy", Role.CASHIER, "x");
        station.station = true;
        AuthService none = withAttendance(java.util.Set.of(), java.util.Set.of(Role.WAITER));
        assertEquals("NOT_CHECKED_IN", assertThrows(AuthException.class, () -> none.requireOnDuty(station)).code);
        withAttendance(java.util.Set.of(), java.util.Set.of(Role.CASHIER)).requireOnDuty(station);
    }

    @Test
    void ownerIsNotBoundByAttendance() throws Exception {
        withAttendance(java.util.Set.of(), java.util.Set.of()).requireOnDuty(new Account(1, "owner", "Chủ quán", Role.OWNER, "x"));
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
