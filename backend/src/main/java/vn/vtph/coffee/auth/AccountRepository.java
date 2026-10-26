package vn.vtph.coffee.auth;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AccountRepository {

    /** Khóa dòng (SELECT ... FOR UPDATE) để hai lần đăng nhập đồng thời không làm sai bộ đếm nhập sai. */
    Optional<Account> findByUsernameForUpdate(String username);

    /** Danh sách tài khoản nhân viên (không gồm Chủ quán/Quản lý) cho màn chọn tài khoản trên thiết bị dùng chung. */
    List<Account> findSelectableStaff();

    void saveAttemptState(long accountId, int failedAttempts, AccountStatus status, LocalDateTime lockedUntil);

    /** Đăng nhập thành công: về 0 lần sai, trạng thái ACTIVE, xóa thời điểm hết khóa. */
    void resetAttempts(long accountId);

    void updateSecretHash(long accountId, String newHash);
}
