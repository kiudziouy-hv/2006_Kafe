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

    /** Người đứng quầy thực tế (mã nhân viên) khi đăng nhập tài khoản dùng chung; null nếu thao tác bằng chính tài khoản này. */
    public final Integer actingStaffId;

    Account(int id, String username, String fullName, Role role, String secretHash) {
        this(id, username, fullName, role, secretHash, null);
    }

    Account(int id, String username, String fullName, Role role, String secretHash, Integer actingStaffId) {
        this.id = id;
        this.username = username;
        this.fullName = fullName;
        this.role = role;
        this.secretHash = secretHash;
        this.actingStaffId = actingStaffId;
    }

    /** Bản sao dùng cho một yêu cầu: mọi thao tác ghi theo nhân viên đã chọn lúc đăng nhập (created_by, issued_by...). */
    public Account actingAs(Integer staffId) {
        if (staffId == null) return this;
        Account c = new Account(id, username, fullName, role, secretHash, staffId);
        c.station = station;
        c.permanentlyLocked = permanentlyLocked;
        return c;
    }

    /** Khóa hẳn (nhân viên nghỉ việc): phiên đang mở không còn hiệu lực. */
    public boolean isPermanentlyLocked() {
        return permanentlyLocked;
    }

    boolean isLocked(Instant now) {
        return lockedUntil != null && now.isBefore(lockedUntil);
    }
}
