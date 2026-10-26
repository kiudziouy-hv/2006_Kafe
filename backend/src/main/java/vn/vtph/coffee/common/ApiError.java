package vn.vtph.coffee.common;

/** Dạng lỗi thống nhất trả về cho giao diện: mã máy đọc được và thông báo tiếng Việt. */
public record ApiError(String code, String message) {
}
