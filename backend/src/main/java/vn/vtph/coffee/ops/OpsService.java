package vn.vtph.coffee.ops;

import java.util.List;
import java.util.Map;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.ops.Model.Order;
import vn.vtph.coffee.ops.Model.Shift;

/**
 * Nghiệp vụ gọi món - pha chế - thanh toán. Hai bản cài đặt cùng một hợp đồng API:
 * {@link InMemoryOpsService} (mặc định, dữ liệu giả lập) và {@link JdbcOpsService} (profile "mysql").
 * Người thao tác được truyền vào dạng {@link Account} để bản MySQL ghi đúng nhân viên (created_by, issued_by...).
 */
public interface OpsService {
    /** Thành viên và số điểm dùng khi thanh toán (BR-023); {@link #NONE} là khách không dùng điểm. */
    record Payer(Integer customerId, int points, Integer staffId) {
        public static final Payer NONE = new Payer(null, 0);
        public Payer(Integer customerId, int points) { this(customerId, points, null); }
    }

    Map<String, Object> menu();
    List<Map<String, Object>> tables();

    // Phục vụ
    Order send(int table, List<Map<String, Object>> lines, Account by);
    Order orderAtTable(int table);
    Order cancelLine(int orderId, int lineId, String reason, Account by);
    Order move(int orderId, int to);
    Order finish(int orderId);

    // Pha chế
    Map<String, Object> kitchen();
    Map<String, Object> start(int lineId);
    Map<String, Object> done(int lineId);

    // Thu ngân
    Map<String, Object> shiftState();
    Shift openShift(String type, Integer openingCash, Account by);
    Shift closeShift(Integer actualCash, Account by);
    List<Order> pending();
    Order get(int id);
    Order pay(int orderId, String method, Integer received, Account by);
    default Order pay(int orderId, String method, Integer received, Account by, Payer payer) { return pay(orderId, method, received, by); }
    Order takeaway(List<Map<String, Object>> lines, String method, Integer received, Account by);
    default Order takeaway(List<Map<String, Object>> lines, String method, Integer received, Account by, Payer payer) { return takeaway(lines, method, received, by); }
    List<Order> drafts();
    /** Đơn mang đi đã thanh toán trong ca đang mở mà chưa giao cho khách (Thu ngân giao); chốt ca bị chặn khi còn đơn như vậy. */
    List<Order> handovers();
    /** Thu ngân giao đồ cho khách; chỉ giao được khi mọi dòng món chưa hủy đã pha xong. */
    Order handover(int orderId, Account by);
    /** Tính thử đơn mang đi (tạm tính, khuyến mãi áp dụng ngay lúc này, số điểm tối đa) để hiển thị trước khi xác nhận. */
    default Map<String, Object> quote(List<Map<String, Object>> lines) {
        throw new OpsException(501, "NOT_SUPPORTED", "Chức năng tính thử chỉ có ở chế độ MySQL.");
    }
    Order confirmDraft(int id, Account by);
    default Order confirmDraft(int id, Account by, Payer payer) { return confirmDraft(id, by); }
    Order cancelDraft(int id, Account by);
    /** ASM-03: báo lại số tiền hiện tại cho đơn nháp sau khi giá/khuyến mãi đổi (xác nhận bị chặn với AMOUNT_CHANGED). */
    default Order requoteDraft(int id, Account by) { throw new OpsException(501, "NOT_SUPPORTED", "Chức năng này cần chạy với MySQL."); }
}
