package vn.vtph.coffee.notification;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import vn.vtph.coffee.ops.OpsEvent;

/**
 * Chuyển sự kiện nghiệp vụ thành thông báo thời gian thực (UC-14, UC-11, UC-22).
 * WebSocket chỉ báo "có thay đổi"; dữ liệu đúng luôn lấy lại qua REST API (client tải lại khi nhận sự kiện hoặc khi nối lại).
 */
@Component
public class NotificationBridge {
    public static final String KITCHEN = "/topic/kitchen";
    public static final String SERVICE = "/topic/service";
    public static final String CASHIER = "/topic/cashier";

    private final SimpMessagingTemplate broker;

    public NotificationBridge(SimpMessagingTemplate broker) {
        this.broker = broker;
    }

    /** Sau khi giao dịch ghi CSDL thành công mới báo ("lưu trước, báo sau"); không có giao dịch (chế độ giả lập) thì báo ngay. */
    @TransactionalEventListener(fallbackExecution = true)
    public void onOps(OpsEvent e) {
        Map<String, Object> msg = new LinkedHashMap<>(e.data());
        msg.put("type", e.type());
        msg.put("at", Instant.now().toString());
        for (String topic : topicsFor(e.type())) broker.convertAndSend(topic, msg);
    }

    static List<String> topicsFor(String type) {
        return switch (type) {
            case "ORDER_SENT", "LINE_CANCELLED" -> List.of(KITCHEN);
            case "LINE_SHORTAGE" -> List.of(KITCHEN, SERVICE, CASHIER);
            case "LINE_MAKING" -> List.of(SERVICE);
            case "LINE_DONE", "TABLE_WAITING_PAY" -> List.of(SERVICE, CASHIER);
            case "ORDER_PAID" -> List.of(SERVICE, CASHIER);
            default -> List.of();
        };
    }
}
