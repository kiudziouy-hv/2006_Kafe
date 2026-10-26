package vn.vtph.coffee.auth;

/** Khớp ENUM account.status: TEMP_LOCKED là khóa tạm 15 phút do nhập sai, LOCKED do Chủ quán khóa. */
public enum AccountStatus {
    ACTIVE,
    TEMP_LOCKED,
    LOCKED
}
