package vn.vtph.coffee.auth;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Nơi lưu tài khoản: bộ nhớ (chế độ giả lập) hoặc bảng account/employee của MySQL (profile "mysql"). */
public interface AccountStore {
    List<Account> all();

    Optional<Account> byId(int id);

    Optional<Account> ownerByUsername(String username);

    /** Người này đã chấm công vào và chưa chấm công ra (chế độ giả lập không có chấm công nên luôn đúng). */
    default boolean onDuty(Account a) { return true; }

    /** Có ít nhất một nhân viên cá nhân của vai trò này đang chấm công. */
    default boolean anyOnDuty(Role role) { return true; }

    /** Nhân viên cá nhân của vai trò này đang chấm công (mã nhân viên, họ tên), để chọn tên khi vào tài khoản quầy. */
    default List<Map<String, Object>> onDutyStaff(Role role) { return List.of(); }

    /** Tài khoản cá nhân (không phải quầy) của nhân viên với vai trò này; chế độ giả lập không có nên trả rỗng. */
    default Optional<Account> personalByEmployee(int employeeId, Role role) { return Optional.empty(); }

    /** Ghi lại số lần sai, thời điểm khóa và trạng thái khóa của tài khoản. */
    void saveLockState(Account a);

    /** Thay giá trị băm (nâng cấp băm cũ lên bcrypt sau khi đăng nhập đúng). */
    void saveHash(Account a);
}
