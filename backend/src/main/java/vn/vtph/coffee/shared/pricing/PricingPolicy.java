package vn.vtph.coffee.shared.pricing;

/**
 * Quy tắc tính tiền và điểm thành viên (BR-020..BR-023, BR-027), thuần Java: không phụ thuộc Spring, JDBC hay HTTP.
 *
 * <p>Thứ tự tính của một hóa đơn (BR-021): (1) giá món + topping nhân số lượng, (2) trừ khuyến mãi
 * ({@link #promotionDiscount}), (3) trừ điểm đã dùng, (4) làm tròn 500đ ({@link #payableAfterPoints}),
 * (5) tích điểm trên số tiền khách thực trả ({@link #pointsEarned}).
 *
 * <p>Tiền là VND nguyên, nên dùng {@code long} với phép chia số nguyên (không dùng {@code double}, không cần
 * {@code BigDecimal}). Phép chia cắt phần lẻ về 0 giống hệt mã cũ; với số không âm cũng là làm tròn xuống.
 * Các hàm này chỉ giữ lại hành vi hiện có: không kiểm tra đầu vào, không ném ngoại lệ (kiểm tra và thông điệp lỗi
 * nằm ở service).
 */
public final class PricingPolicy {
    /** Làm tròn số tiền phải trả đến bội số của 500đ (BR-021 bước 4). */
    static final int ROUNDING_STEP = 500;
    /** Giá trị quy đổi của 1 điểm khi dùng: 1 điểm = 1.000đ (BR-023). */
    static final int VND_PER_REDEEMED_POINT = 1_000;
    /** Mỗi 10.000đ khách thực trả được 1 điểm tích lũy (BR-023). */
    static final int VND_PER_EARNED_POINT = 10_000;
    /** Số điểm dùng tối đa cho một đơn: 30% giá trị đơn sau khuyến mãi (BR-023). */
    static final int MAX_REDEMPTION_PERCENT = 30;

    private PricingPolicy() {}

    /** Khuyến mãi của một dòng: {@code giá trị dòng x phần trăm / 100}, bỏ phần lẻ (BR-020). */
    public static long promotionDiscount(long lineValue, int percent) {
        return lineValue * percent / 100;
    }

    /** Số điểm tối đa được dùng cho đơn có giá trị sau khuyến mãi là {@code afterPromo}, làm tròn xuống (BR-023): 87.500đ cho 26 điểm. */
    public static int maxRedeemablePoints(long afterPromo) {
        return (int) (afterPromo * MAX_REDEMPTION_PERCENT / (100L * VND_PER_REDEEMED_POINT));
    }

    /** Làm tròn đến 500đ gần nhất; nằm đúng giữa hai mức thì làm tròn lên (BR-021 bước 4). */
    public static int roundToNearest500(long amount) {
        return (int) (Math.floorDiv(amount + ROUNDING_STEP / 2, ROUNDING_STEP) * ROUNDING_STEP);
    }

    /** Số tiền khách phải trả: (giá trị sau khuyến mãi - điểm dùng x 1.000đ) rồi làm tròn 500đ (BR-021 bước 3 - 4). */
    public static int payableAfterPoints(long afterPromo, int pointsUsed) {
        return roundToNearest500(afterPromo - pointsUsed * (long) VND_PER_REDEEMED_POINT);
    }

    /** Điểm tích lũy trên số tiền khách thực trả: mỗi 10.000đ một điểm, phần lẻ không tích, số âm coi như 0 (BR-023). */
    public static int pointsEarned(long paidAmount) {
        return (int) (Math.max(0, paidAmount) / VND_PER_EARNED_POINT);
    }
}
