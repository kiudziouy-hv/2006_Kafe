package vn.vtph.coffee.auth;

/** Người dùng đã xác thực, lấy từ JWT của mỗi request. */
public record AuthUser(long accountId, long employeeId, String username, Role role) {
}
