package vn.vtph.coffee.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import vn.vtph.coffee.config.JwtProperties;

class JwtServiceTest {

    private static final String SECRET = "0123456789-0123456789-0123456789-xx";
    private static final Account ACCOUNT =
            new Account(7, 70, "Trần Thị Bích", "thungan1", "x", Role.CASHIER, AccountStatus.ACTIVE, 0, null);

    private static Clock at(Instant i) {
        return Clock.fixed(i, ZoneOffset.UTC);
    }

    @Test
    void roundTripKeepsIdentityAndRole() {
        Instant t0 = Instant.parse("2026-10-26T07:00:00Z");
        JwtService jwt = new JwtService(new JwtProperties(SECRET, 600), at(t0));
        JwtService.IssuedToken issued = jwt.issue(ACCOUNT);

        assertEquals(t0.plus(Duration.ofMinutes(600)), issued.expiresAt());
        Optional<AuthUser> user = jwt.parse(issued.token());
        assertTrue(user.isPresent());
        assertEquals(new AuthUser(7, 70, "thungan1", Role.CASHIER), user.get());
    }

    @Test
    void expiredTokenIsRejected() {
        Instant t0 = Instant.parse("2026-10-26T07:00:00Z");
        String token = new JwtService(new JwtProperties(SECRET, 10), at(t0)).issue(ACCOUNT).token();
        JwtService later = new JwtService(new JwtProperties(SECRET, 10), at(t0.plus(Duration.ofMinutes(11))));
        assertTrue(later.parse(token).isEmpty());
    }

    @Test
    void tamperedOrForeignTokenIsRejected() {
        Clock c = at(Instant.parse("2026-10-26T07:00:00Z"));
        JwtService jwt = new JwtService(new JwtProperties(SECRET, 600), c);
        String token = jwt.issue(ACCOUNT).token();

        JwtService other = new JwtService(new JwtProperties("another-secret-another-secret-another!", 600), c);
        assertTrue(other.parse(token).isEmpty());
        assertTrue(jwt.parse(token.substring(0, token.length() - 3) + "abc").isEmpty());
        assertTrue(jwt.parse("not-a-jwt").isEmpty());
    }

    @Test
    void missingOrShortSecretFailsFast() {
        Clock c = at(Instant.parse("2026-10-26T07:00:00Z"));
        assertThrows(IllegalStateException.class, () -> new JwtService(new JwtProperties("", 600), c));
        assertThrows(IllegalStateException.class, () -> new JwtService(new JwtProperties(null, 600), c));
        assertThrows(IllegalStateException.class, () -> new JwtService(new JwtProperties("short", 600), c));
    }
}
