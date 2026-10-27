package vn.vtph.coffee.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;
import vn.vtph.coffee.config.JwtProperties;

@Service
public class JwtService implements TokenIssuer {

    private static final int MIN_SECRET_BYTES = 32;

    private final SecretKey key;
    private final Duration ttl;
    private final Clock clock;

    public JwtService(JwtProperties props, Clock clock) {
        String secret = props.secret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "Chưa cấu hình JWT_SECRET hoặc quá ngắn: cần chuỗi bí mật tối thiểu " + MIN_SECRET_BYTES + " ký tự");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.ttl = Duration.ofMinutes(props.ttlMinutes());
        this.clock = clock;
    }

    @Override
    public IssuedToken issue(Account account) {
        Instant now = clock.instant();
        Instant expires = now.plus(ttl);
        String token = Jwts.builder()
                .subject(String.valueOf(account.accountId()))
                .claim("emp", account.employeeId())
                .claim("usr", account.username())
                .claim("role", account.role().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expires))
                .signWith(key)
                .compact();
        return new IssuedToken(token, expires);
    }

    /** Trả rỗng nếu token sai chữ ký, hết hạn hoặc hỏng; không ném lỗi ra ngoài. */
    public Optional<AuthUser> parse(String token) {
        try {
            Claims c = Jwts.parser()
                    .verifyWith(key)
                    .clock(() -> Date.from(clock.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(new AuthUser(
                    Long.parseLong(c.getSubject()),
                    c.get("emp", Number.class).longValue(),
                    c.get("usr", String.class),
                    Role.valueOf(c.get("role", String.class))));
        } catch (JwtException | IllegalArgumentException | NullPointerException e) {
            return Optional.empty();
        }
    }
}
