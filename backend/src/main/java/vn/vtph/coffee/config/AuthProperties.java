package vn.vtph.coffee.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Cấu hình đăng nhập. BR-042: sai 5 lần liên tiếp thì khóa 15 phút.
 * Cột account.failed_attempts có CHECK (<= 5) nên ngưỡng khóa không được lớn hơn 5.
 */
@ConfigurationProperties("vtph.auth")
public record AuthProperties(
        @DefaultValue("5") int maxFailedAttempts,
        @DefaultValue("15") int lockMinutes,
        @DefaultValue("false") boolean acceptLegacyDemoHash) {

    public AuthProperties {
        if (maxFailedAttempts < 1 || maxFailedAttempts > 5) {
            throw new IllegalArgumentException("vtph.auth.max-failed-attempts phải nằm trong khoảng 1..5 (ràng buộc ck_account_attempts)");
        }
        if (lockMinutes < 1) {
            throw new IllegalArgumentException("vtph.auth.lock-minutes phải >= 1");
        }
    }
}
