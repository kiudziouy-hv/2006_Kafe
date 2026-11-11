package vn.vtph.coffee.shared.pricing;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/**
 * Bảo vệ hành vi của {@link PricingPolicy}. Phần "bản cũ" là bản sao nguyên văn các công thức đã được thay thế
 * (ghi nguồn ngay trên từng hàm), dùng làm tham chiếu để chứng minh việc gom logic không đổi kết quả.
 */
class PricingPolicyTest {

    // ---- công thức cũ, sao chép nguyên văn ----
    /** JdbcOpsService.round500 (và InMemoryOpsService): dùng số thực. */
    private static int legacyRound500Double(long total) { return (int) (Math.floor(total / 500.0 + 0.5) * 500); }
    /** Db.round500 (InvoiceService): dùng chia nguyên. */
    private static int legacyRound500Int(long amount) { return (int) (Math.floorDiv(amount + 250, 500) * 500); }
    /** JdbcOpsService.maxPoints. */
    private static int legacyMaxPoints(int afterPromo) { return (int) (afterPromo * 30L / 100_000); }
    /** JdbcOpsService.toOrder/amounts/quote và InvoiceService.cancelLine: {@code value * percent / 100} trên số long. */
    private static long legacyDiscount(long value, int percent) { return value * percent / 100; }
    /** JdbcOpsService.settle: {@code rounded / 10_000} (int, không chặn số âm). */
    private static int legacySettleEarned(int rounded) { return rounded / 10_000; }
    /** InvoiceService.cancelLine: {@code (int) (Math.max(0, paidNow) / 10_000)}. */
    private static int legacyInvoiceEarned(long paidNow) { return (int) (Math.max(0, paidNow) / 10_000); }

    @Test
    void roundingGoesToTheNearest500AndHalfWayRoundsUp() {
        long[][] cases = { {0, 0}, {1, 0}, {249, 0}, {250, 500}, {251, 500}, {499, 500}, {500, 500}, {749, 500}, {750, 1000}, {751, 1000},
                {21_750, 22_000}, {21_749, 21_500}, {26_560, 26_500}, {25_920, 26_000}, {28_480, 28_500}, {72_000, 72_000},
                {-1, 0}, {-249, 0}, {-250, 0}, {-251, -500}, {-499, -500}, {-750, -500}, {-751, -1000} };
        for (long[] c : cases) assertEquals((int) c[1], PricingPolicy.roundToNearest500(c[0]), "round500(" + c[0] + ")");
    }

    @Test
    void roundingMatchesBothLegacyImplementationsOverAWideRange() {
        for (long v = -50_000; v <= 5_000_000; v++) {
            int got = PricingPolicy.roundToNearest500(v);
            assertEquals(legacyRound500Double(v), got, "double " + v);
            assertEquals(legacyRound500Int(v), got, "int " + v);
        }
        for (long v : new long[] {Integer.MAX_VALUE - 250L, 1_000_000_000L, 2_000_000_000L})
            assertEquals(legacyRound500Double(v), PricingPolicy.roundToNearest500(v), "large " + v);
    }

    @Test
    void promotionDiscountTruncatesTheFraction() {
        assertEquals(0, PricingPolicy.promotionDiscount(100_000, 0));
        assertEquals(0, PricingPolicy.promotionDiscount(0, 20));
        assertEquals(20_000, PricingPolicy.promotionDiscount(100_000, 20));
        assertEquals(7_250, PricingPolicy.promotionDiscount(29_000, 25)); // đúng, không lẻ
        assertEquals(1_851, PricingPolicy.promotionDiscount(12_345, 15)); // 1.851,75 -> 1.851
        assertEquals(0, PricingPolicy.promotionDiscount(99, 1)); // 0,99 -> 0
        assertEquals(1, PricingPolicy.promotionDiscount(100, 1));
        assertEquals(100_000, PricingPolicy.promotionDiscount(100_000, 100));
        assertEquals(2_147_483_647L * 50 / 100, PricingPolicy.promotionDiscount(Integer.MAX_VALUE, 50)); // không tràn số
    }

    @Test
    void maxRedeemablePointsIsThirtyPercentRoundedDown() {
        assertEquals(26, PricingPolicy.maxRedeemablePoints(87_500)); // ví dụ của BR-023
        assertEquals(24, PricingPolicy.maxRedeemablePoints(80_000));
        assertEquals(28, PricingPolicy.maxRedeemablePoints(96_000)); // 28,8
        assertEquals(6, PricingPolicy.maxRedeemablePoints(21_750)); // 6,525
        assertEquals(30, PricingPolicy.maxRedeemablePoints(100_000));
        assertEquals(0, PricingPolicy.maxRedeemablePoints(0));
        assertEquals(0, PricingPolicy.maxRedeemablePoints(3_333)); // 0,9999
        assertEquals(1, PricingPolicy.maxRedeemablePoints(3_334)); // 1,0002
        for (int v = 0; v <= 2_000_000; v += 7) assertEquals(legacyMaxPoints(v), PricingPolicy.maxRedeemablePoints(v), "max " + v);
        assertEquals(legacyMaxPoints(Integer.MAX_VALUE), PricingPolicy.maxRedeemablePoints(Integer.MAX_VALUE));
    }

    @Test
    void payableDeductsPointsAtOneThousandEachThenRounds() {
        assertEquals(61_500, PricingPolicy.payableAfterPoints(87_500, 26));
        assertEquals(72_000, PricingPolicy.payableAfterPoints(77_000, 5));
        assertEquals(68_000, PricingPolicy.payableAfterPoints(96_000, 28));
        assertEquals(22_000, PricingPolicy.payableAfterPoints(21_750, 0)); // nửa mức -> lên
        assertEquals(21_000, PricingPolicy.payableAfterPoints(21_750, 1)); // 20.750 -> 21.000
        assertEquals(0, PricingPolicy.payableAfterPoints(0, 0));
        for (int after = 0; after <= 300_000; after += 13)
            for (int pts = 0; pts <= 90; pts += 7)
                assertEquals(legacyRound500Double(after - pts * 1000L), PricingPolicy.payableAfterPoints(after, pts), after + "/" + pts);
    }

    @Test
    void pointsEarnedIsOnePerTenThousandWithoutTheRemainderAndNeverNegative() {
        assertEquals(0, PricingPolicy.pointsEarned(0));
        assertEquals(0, PricingPolicy.pointsEarned(9_999));
        assertEquals(1, PricingPolicy.pointsEarned(10_000));
        assertEquals(1, PricingPolicy.pointsEarned(19_999));
        assertEquals(2, PricingPolicy.pointsEarned(22_000));
        assertEquals(6, PricingPolicy.pointsEarned(68_000));
        assertEquals(7, PricingPolicy.pointsEarned(72_000));
        assertEquals(0, PricingPolicy.pointsEarned(-1));
        assertEquals(0, PricingPolicy.pointsEarned(-50_000));
    }

    @Test
    void discountAndEarnedPointsMatchTheLegacyExpressionsOnNonNegativeInputs() {
        for (long v = 0; v <= 400_000; v += 37)
            for (int pct = 0; pct <= 100; pct += 5) assertEquals(legacyDiscount(v, pct), PricingPolicy.promotionDiscount(v, pct), v + "x" + pct);
        for (int pct = 0; pct <= 100; pct++)
            assertEquals(legacyDiscount(Integer.MAX_VALUE, pct), PricingPolicy.promotionDiscount(Integer.MAX_VALUE, pct), "max x " + pct);
        for (int paid = 0; paid <= 3_000_000; paid += 500) {
            assertEquals(legacySettleEarned(paid), PricingPolicy.pointsEarned(paid), "settle " + paid);
            assertEquals(legacyInvoiceEarned(paid), PricingPolicy.pointsEarned(paid), "invoice " + paid);
        }
    }

    /**
     * Khác biệt DUY NHẤT đã biết so với mã cũ: {@code settle} cũ chia thẳng {@code rounded / 10_000} (số âm cho điểm âm), còn
     * {@code InvoiceService} cũ đã chặn {@code Math.max(0, ...)}. Chính sách mới dùng cách chặn của InvoiceService cho cả hai.
     * Miền số âm không đạt được ở {@code settle}: giá trị sau KM &ge; 0, điểm dùng &le; 30% (xem
     * {@link #settlePathNeverProducesANegativeAmount}) và CSDL có {@code CHECK (total >= 0)} cùng {@code points_earned UNSIGNED}.
     */
    @Test
    void negativeAmountsAreTheOnlyKnownDifferenceFromTheOldSettleFormula() {
        assertEquals(-1, legacySettleEarned(-15_000));
        assertEquals(0, legacyInvoiceEarned(-15_000));
        assertEquals(0, PricingPolicy.pointsEarned(-15_000));
    }

    @Test
    void settlePathNeverProducesANegativeAmount() {
        for (int after = 0; after <= 1_000_000; after += 250) {
            int maxPoints = PricingPolicy.maxRedeemablePoints(after);
            for (int pts : new int[] {0, maxPoints / 2, maxPoints}) {
                int payable = PricingPolicy.payableAfterPoints(after, pts);
                assertEquals(true, payable >= 0, "payable " + after + "/" + pts);
                assertEquals(legacySettleEarned(payable), PricingPolicy.pointsEarned(payable), "earned " + after + "/" + pts);
            }
        }
    }
}
