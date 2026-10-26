package vn.vtph.coffee.auth;

/** Bốn vai trò theo Chương 3: Chủ quán/Quản lý kế thừa mọi quyền của ba vai trò còn lại. */
public enum Role {
    OWNER, WAITER, CASHIER, BARISTA;

    /** Thu ngân và màn hình pha chế tự đăng xuất sau 5 phút không thao tác (UC-02). */
    public boolean autoLogout() {
        return this == CASHIER || this == BARISTA;
    }

    /** Màn hình trang chủ theo vai trò (UI_GD4 mục 8.6). */
    public String homeScreen() {
        return switch (this) {
            case OWNER -> "S54";
            case WAITER -> "S10";
            case CASHIER -> "S20";
            case BARISTA -> "S30";
        };
    }
}
