package vn.vtph.coffee.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Map;
import org.junit.jupiter.api.Test;
import vn.vtph.coffee.ops.OpsException;

/** Ràng buộc dữ liệu nhập: số tiền không âm/không quá lớn/không thập phân, chuỗi không vượt độ dài cột. */
class DbInputTest {
    @Test
    void moneyAcceptsValidAndAbsentValues() {
        assertNull(Db.money(null, "Tiền", 100));
        assertEquals(0, Db.money(0, "Tiền", 100));
        assertEquals(100, Db.money("100", "Tiền", 100));
        assertEquals(50, Db.money(50.0, "Tiền", 100));
    }

    @Test
    void moneyRejectsNegativeDecimalHugeAndGarbage() {
        for (Object bad : new Object[]{-1, -0.5, 1.5, 101, 4_294_967_296L, "abc", "1e400"})
            assertEquals("BAD_NUMBER", assertThrows(OpsException.class, () -> Db.money(bad, "Tiền", 100)).code, String.valueOf(bad));
    }

    @Test
    void textLongerThanColumnIsRejected() {
        assertEquals("TOO_LONG", assertThrows(OpsException.class, () -> Db.req(Map.of("n", "x".repeat(101)), "n", "Tên", 100)).code);
        assertEquals("REQUIRED", assertThrows(OpsException.class, () -> Db.req(Map.of("n", "  "), "n", "Tên", 100)).code);
        assertEquals("abc", Db.req(Map.of("n", " abc "), "n", "Tên", 100));
    }

    @Test
    void hugeIntegerStringDoesNotCrash() {
        assertNull(Db.integer(Map.of("n", "99999999999999999999"), "n"));
    }
}
