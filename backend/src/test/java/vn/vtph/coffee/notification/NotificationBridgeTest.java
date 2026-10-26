package vn.vtph.coffee.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

/** Luồng: phục vụ gửi đơn -> pha chế; pha chế hoàn thành -> phục vụ và thu ngân. */
class NotificationBridgeTest {
    @Test
    void sentOrderGoesToKitchenOnly() {
        assertEquals(List.of(NotificationBridge.KITCHEN), NotificationBridge.topicsFor("ORDER_SENT"));
    }

    @Test
    void doneLineNotifiesWaiterAndCashier() {
        List<String> t = NotificationBridge.topicsFor("LINE_DONE");
        assertTrue(t.contains(NotificationBridge.SERVICE) && t.contains(NotificationBridge.CASHIER));
    }

    @Test
    void unknownEventsAreIgnored() {
        assertTrue(NotificationBridge.topicsFor("SOMETHING_ELSE").isEmpty());
    }
}
