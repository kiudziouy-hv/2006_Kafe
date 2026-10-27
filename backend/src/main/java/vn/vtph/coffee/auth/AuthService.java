package vn.vtph.coffee.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vtph.coffee.common.BusinessException;
import vn.vtph.coffee.config.AuthProperties;

/**
 * Xác thực bằng tên tài khoản và mật khẩu/PIN (M01). BR-042: sai 5 lần liên tiếp thì khóa 15 phút.
 * Dùng chung cho đăng nhập và chấm công bằng PIN (FR-M10-002), nên cả hai cùng chịu quy tắc khóa.
 */
@Service
public class AuthService {

    public record AccountView(long accountId, long employeeId, String fullName, String username, Role role) {
        public static AccountView of(Account a) {
            return new AccountView(a.accountId(), a.employeeId(), a.fullName(), a.username(), a.role());
        }
    }

    public record LoginResult(String token, java.time.Instant expiresAt, AccountView account) {
    }

    private static final Pattern HEX_SHA256 = Pattern.compile("^[0-9a-fA-F]{64}$");
    private static final String INVALID = "Tên tài khoản hoặc mã PIN/mật khẩu không đúng";

    private enum Match { NO, YES, YES_LEGACY }

    private final AccountRepository accounts;
    private final PasswordEncoder encoder;
    private final TokenIssuer tokens;
    private final AuthProperties props;
    private final Clock clock;

    public AuthService(AccountRepository accounts, PasswordEncoder encoder, TokenIssuer tokens,
                       AuthProperties props, Clock clock) {
        this.accounts = accounts;
        this.encoder = encoder;
        this.tokens = tokens;
        this.props = props;
        this.clock = clock;
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public LoginResult login(String username, String secret) {
        Account acc = verify(username, secret);
        TokenIssuer.IssuedToken t = tokens.issue(acc);
        return new LoginResult(t.token(), t.expiresAt(), AccountView.of(acc));
    }

    /**
     * Kiểm tra mật khẩu/PIN và cập nhật bộ đếm nhập sai. Trả về tài khoản nếu đúng.
     *
     * <p>noRollbackFor: các lỗi 401/423 được ném sau khi đã ghi bộ đếm nhập sai; nếu giao dịch rollback
     * thì bộ đếm không bao giờ tăng và tài khoản không bao giờ bị khóa. Nơi gọi hàm này trong giao dịch
     * của chính nó cũng phải khai báo noRollbackFor = BusinessException.class.
     */
    @Transactional(noRollbackFor = BusinessException.class)
    public Account verify(String username, String secret) {
        Account acc = accounts.findByUsernameForUpdate(username)
                .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", INVALID));
        LocalDateTime now = LocalDateTime.now(clock);

        if (acc.status() == AccountStatus.LOCKED) {
            throw new BusinessException(HttpStatus.LOCKED, "ACCOUNT_LOCKED",
                    "Tài khoản đã bị khóa. Vui lòng liên hệ Chủ quán/Quản lý");
        }

        int failed = acc.failedAttempts();
        if (acc.status() == AccountStatus.TEMP_LOCKED) {
            if (acc.lockedUntil() != null && acc.lockedUntil().isAfter(now)) {
                throw tempLocked(acc.lockedUntil(), now);
            }
            failed = 0; // hết thời gian khóa tạm: tính lại từ đầu
        }

        Match match = matches(acc, secret);
        if (match == Match.NO) {
            failed++;
            if (failed >= props.maxFailedAttempts()) {
                LocalDateTime until = now.plusMinutes(props.lockMinutes());
                accounts.saveAttemptState(acc.accountId(), failed, AccountStatus.TEMP_LOCKED, until);
                throw tempLocked(until, now);
            }
            accounts.saveAttemptState(acc.accountId(), failed, AccountStatus.ACTIVE, null);
            int left = props.maxFailedAttempts() - failed;
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS",
                    "Sai mã PIN/mật khẩu. Còn " + left + " lần thử trước khi bị khóa " + props.lockMinutes() + " phút");
        }

        accounts.resetAttempts(acc.accountId());
        if (match == Match.YES_LEGACY) {
            accounts.updateSecretHash(acc.accountId(), encoder.encode(secret));
        }
        return acc;
    }

    public List<AccountView> selectableStaff() {
        return accounts.findSelectableStaff().stream().map(AccountView::of).toList();
    }

    private BusinessException tempLocked(LocalDateTime until, LocalDateTime now) {
        long minutes = Math.max(1, (Duration.between(now, until).toSeconds() + 59) / 60);
        return new BusinessException(HttpStatus.LOCKED, "ACCOUNT_TEMP_LOCKED",
                "Tài khoản tạm khóa do nhập sai nhiều lần. Thử lại sau " + minutes + " phút");
    }

    private Match matches(Account acc, String secret) {
        String hash = acc.secretHash();
        if (hash.startsWith("$2")) {
            return encoder.matches(secret, hash) ? Match.YES : Match.NO;
        }
        // Chỉ dành cho dữ liệu demo trong 03_seed_master.sql: SHA2('demo-' + username + '-' + mật khẩu).
        if (props.acceptLegacyDemoHash() && HEX_SHA256.matcher(hash).matches()) {
            byte[] expected = HexFormat.of().parseHex(hash.toLowerCase());
            byte[] actual = sha256("demo-" + acc.username() + "-" + secret);
            return MessageDigest.isEqual(expected, actual) ? Match.YES_LEGACY : Match.NO;
        }
        return Match.NO;
    }

    private static byte[] sha256(String s) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
