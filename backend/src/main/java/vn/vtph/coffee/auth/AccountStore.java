package vn.vtph.coffee.auth;

import java.util.List;
import java.util.Optional;

/** Nơi lưu tài khoản: bộ nhớ (chế độ giả lập) hoặc bảng account/employee của MySQL (profile "mysql"). */
public interface AccountStore {
    List<Account> all();

    Optional<Account> byId(int id);

    Optional<Account> ownerByUsername(String username);

    /** Ghi lại số lần sai, thời điểm khóa và trạng thái khóa của tài khoản. */
    void saveLockState(Account a);

    /** Thay giá trị băm (nâng cấp băm cũ lên bcrypt sau khi đăng nhập đúng). */
    void saveHash(Account a);
}
