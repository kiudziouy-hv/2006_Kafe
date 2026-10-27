package vn.vtph.coffee.auth;

import java.time.Instant;

/**
 * Tài khoản đăng nhập. Bí mật (PIN/mật khẩu) chỉ lưu dạng băm bcrypt.
 * Trạng thái khóa khớp bảng account: failed_attempts, locked_until (khóa tạm 15 phút), status LOCKED (khóa hẳn).
 */
public class Account {
    public final int id;
    public final String username;
    public final String fullName;
    public final Role role;
    String secretHash;
    int failedAttempts;
    Instant lockedUntil;
    boolean permanentlyLocked;
    /** Tài khoản quầy dùng chung (thu ngân, pha chế): đăng nhập thao tác được, không chấm công. */
    public boolean station;

    Account(int id, String username, String fullName, Role role, String secretHash) {
        this.id = id;
        this.username = username;
        this.fullName = fullName;
        this.role = role;
        this.secretHash = secretHash;
    }

    /** Khóa hẳn (nhân viên nghỉ việc): phiên đang mở không còn hiệu lực. */
    public boolean isPermanentlyLocked() {
        return permanentlyLocked;
    }

    boolean isLocked(Instant now) {
        return lockedUntil != null && now.isBefore(lockedUntil);
    }
}
