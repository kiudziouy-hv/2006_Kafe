package vn.vtph.coffee.auth;

import java.time.LocalDateTime;

/** Tài khoản đăng nhập cùng họ tên nhân viên (bảng account ghép employee). */
public record Account(
        long accountId,
        long employeeId,
        String fullName,
        String username,
        String secretHash,
        Role role,
        AccountStatus status,
        int failedAttempts,
        LocalDateTime lockedUntil) {
}
