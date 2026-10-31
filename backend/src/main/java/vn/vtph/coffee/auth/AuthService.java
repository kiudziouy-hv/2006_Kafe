package vn.vtph.coffee.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Đăng nhập theo UC-01: nhân viên dùng PIN 6 số, Chủ quán dùng tên đăng nhập + mật khẩu.
 * Sai 5 lần liên tiếp thì khóa tạm 15 phút (BR-042). Bí mật băm bcrypt; trạng thái khóa lưu qua {@link AccountStore}.
 *
 * <p>Dữ liệu mẫu của Chương 5 (03_seed_master.sql) băm SHA-256 kiểu "demo-{username}-{bí mật}". Khi bật
 * {@code vtph.auth.legacy-demo-hash} (chỉ môi trường phát triển), băm cũ được chấp nhận một lần và tự nâng lên bcrypt.
 */
@Service
public class AuthService {
    public static final int MAX_ATTEMPTS = 5;
    public static final Duration LOCK_TIME = Duration.ofMinutes(15);

    /** Công tắc ràng buộc chấm công mới được đăng nhập; mặc định bật. Chỉ tắt trong test tích hợp cũ không chấm công. */
    @Value("${vtph.auth.require-attendance:true}")
    private boolean requireAttendance = true;

    private final AccountStore store;
    private final PasswordEncoder encoder;
    private final boolean legacyDemoHash;

    public AuthService(AccountStore store, PasswordEncoder encoder,
                       @Value("${vtph.auth.legacy-demo-hash:false}") boolean legacyDemoHash) {
        this.store = store;
        this.encoder = encoder;
        this.legacyDemoHash = legacyDemoHash;
    }

    /** Danh sách tài khoản nhân viên (kèm tài khoản quầy dùng chung, cờ {@code station}) để chọn ở màn S01 (Chủ quán đăng nhập ở S02, không hiện ở đây). */
    public List<Map<String, Object>> staffList() {
        List<Map<String, Object>> out = new ArrayList<>();
        Instant now = Instant.now();
        for (Account a : store.all()) {
            if (a.role == Role.OWNER) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.id);
            m.put("fullName", a.fullName);
            m.put("role", a.role.name());
            m.put("locked", a.permanentlyLocked || a.isLocked(now));
            m.put("station", a.station);
            out.add(m);
        }
        return out;
    }

    public Account loginStaff(int accountId, String pin) {
        Account a = store.byId(accountId).orElse(null);
        if (a == null || a.role == Role.OWNER) throw new AuthException("NOT_FOUND", "Không tìm thấy tài khoản.", 404, 0, 0);
        if (pin == null || !pin.matches("\\d{6}")) throw new AuthException("INVALID_FORMAT", "Mã PIN gồm đúng 6 chữ số.", 400, 0, 0);
        return check(a, pin, "Mã PIN không đúng.");
    }

    /**
     * Ràng buộc chấm công: nhân viên chỉ được vào hệ thống khi đã chấm công vào. Tài khoản cá nhân thì chính người đó phải đang chấm công;
     * tài khoản quầy dùng chung thì phải có ít nhất một nhân viên cùng vai trò đang chấm công. Chủ quán/Quản lý không bị ràng buộc.
     * Gọi sau khi PIN đúng; chấm công vào/ra dùng {@link #loginStaff} nên không bị chặn.
     */
    public void requireOnDuty(Account a) {
        if (!requireAttendance || a.role == Role.OWNER) return;
        if (a.station ? !store.anyOnDuty(a.role) : !store.onDuty(a)) {
            throw new AuthException("NOT_CHECKED_IN", a.station
                    ? "Chưa có nhân viên nào chấm công vào ca. Hãy chấm công trước khi đăng nhập."
                    : "Bạn chưa chấm công vào ca. Hãy chấm công trước khi đăng nhập.", 403, 0, 0);
        }
    }

    public Account loginOwner(String username, String password) {
        Account a = store.ownerByUsername(username == null ? "" : username.trim()).orElse(null);
        if (a == null) throw new AuthException("BAD_CREDENTIALS", "Sai thông tin đăng nhập.", 401, 0, 0);
        return check(a, password == null ? "" : password, "Sai thông tin đăng nhập.");
    }

    private synchronized Account check(Account a, String secret, String wrongMsg) {
        a = store.byId(a.id).orElseThrow(() -> new AuthException("NOT_FOUND", "Không tìm thấy tài khoản.", 404, 0, 0));
        Instant now = Instant.now();
        if (a.permanentlyLocked) throw new AuthException("ACCOUNT_LOCKED", "Tài khoản đã bị khóa. Vui lòng liên hệ Chủ quán.", 423, 0, 0);
        if (a.isLocked(now)) throw locked(a, now);
        if (a.lockedUntil != null) { // khóa đã hết hạn: mở khóa tự động
            a.lockedUntil = null;
            a.failedAttempts = 0;
            store.saveLockState(a);
        }
        if (matches(a, secret)) {
            if (a.failedAttempts != 0) {
                a.failedAttempts = 0;
                store.saveLockState(a);
            }
            return a;
        }
        a.failedAttempts++;
        if (a.failedAttempts >= MAX_ATTEMPTS) {
            a.lockedUntil = now.plus(LOCK_TIME);
            store.saveLockState(a);
            throw locked(a, now);
        }
        store.saveLockState(a);
        throw new AuthException("WRONG_SECRET", wrongMsg, 401, MAX_ATTEMPTS - a.failedAttempts, 0);
    }

    private boolean matches(Account a, String secret) {
        if (isBcrypt(a.secretHash)) return encoder.matches(secret, a.secretHash);
        if (legacyDemoHash && isLegacySha256(a.secretHash) && legacyHash(a.username, secret).equals(a.secretHash)) {
            a.secretHash = encoder.encode(secret); // nâng cấp băm
            store.saveHash(a);
            return true;
        }
        return false;
    }

    static boolean isBcrypt(String h) {
        return h != null && h.startsWith("$2");
    }

    static boolean isLegacySha256(String h) {
        return h != null && h.matches("[0-9a-f]{64}");
    }

    static String legacyHash(String username, String secret) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(("demo-" + username + "-" + secret).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private AuthException locked(Account a, Instant now) {
        long secs = Math.max(1, Duration.between(now, a.lockedUntil).getSeconds());
        return new AuthException("LOCKED", "Tài khoản tạm khóa 15 phút do nhập sai nhiều lần.", 423, 0, secs);
    }

    public Account find(int id) {
        return store.byId(id).orElse(null);
    }
}
