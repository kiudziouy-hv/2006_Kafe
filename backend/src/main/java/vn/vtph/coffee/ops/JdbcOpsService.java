package vn.vtph.coffee.ops;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.ops.Model.Line;
import vn.vtph.coffee.ops.Model.Order;
import vn.vtph.coffee.ops.Model.Shift;
import vn.vtph.coffee.ops.Model.Size;
import vn.vtph.coffee.ops.Model.Topping;
import vn.vtph.coffee.menu.MenuImageStore;
import vn.vtph.coffee.shift.OpenWork;
import vn.vtph.coffee.promotion.PromotionService;
import vn.vtph.coffee.shared.pricing.PricingPolicy;

/**
 * Nghiệp vụ gọi món - pha chế - thanh toán trên MySQL (profile "mysql"), cùng hợp đồng API với {@link InMemoryOpsService}.
 *
 * <p>Dùng các bảng dining_table, menu_item/item_size/topping, orders/dine_in_order/takeaway_order/order_batch/order_line,
 * kèm ingredient/recipe (kho), cashier_session và invoice vì vòng đời đơn không tách rời được các bảng này.
 * Các quy tắc đã có trigger trong CSDL (BR-004, 025, 028, 035, ASM-01...) vẫn là lớp bảo vệ thứ hai; ở đây kiểm tra
 * trước để trả thông báo rõ cho người dùng.
 *
 * <p>Khuyến mãi (UC-27) chốt vào từng dòng món khi đơn được xác nhận gửi, điểm thành viên được tính lúc thanh toán theo
 * {@link PricingPolicy}. Khác biệt có chủ đích so với bản bộ nhớ: tiền khách đưa/tiền thối không lưu (chỉ trả trong phản hồi
 * thanh toán); giờ lưu theo UTC.
 * Sự kiện thời gian thực chỉ được gửi sau khi giao dịch ghi thành công (NotificationBridge dùng AFTER_COMMIT).
 */
@Service
@Profile("mysql")
@Transactional
public class JdbcOpsService implements OpsService {
    private static final Map<String, String> GROUP_LABEL = Map.of("COFFEE", "Coffee", "TEA", "Tea", "SMOOTHIE", "Smoothie", "CAKE", "Cake");
    private static final Set<String> SUGARS = Set.of("0", "30", "50", "70", "100");
    private static final Set<String> ICES = Set.of("NONE", "LESS", "NORMAL");

    private final JdbcTemplate jdbc;
    private final ApplicationEventPublisher events;
    private final ZoneId zone;
    private final PromotionService promotions;
    private final MenuImageStore images;
    private final OpenWork openWork;

    public JdbcOpsService(JdbcTemplate jdbc, ApplicationEventPublisher events, PromotionService promotions, MenuImageStore images,
                          OpenWork openWork, @Value("${vtph.timezone:Asia/Ho_Chi_Minh}") String timezone) {
        this.jdbc = jdbc;
        this.events = events;
        this.promotions = promotions;
        this.images = images;
        this.openWork = openWork;
        this.zone = ZoneId.of(timezone);
    }

    // ================= tiện ích =================
    private static LocalDateTime nowUtc() { return LocalDateTime.now(ZoneOffset.UTC); }

    private LocalDate today() { return LocalDate.now(zone); }

    private static Instant instant(ResultSet rs, String col) throws SQLException {
        LocalDateTime t = rs.getObject(col, LocalDateTime.class);
        return t == null ? null : t.toInstant(ZoneOffset.UTC);
    }

    private <T> T one(String sql, RowMapper<T> mapper, Object... args) {
        List<T> r = jdbc.query(sql, mapper, args);
        return r.isEmpty() ? null : r.get(0);
    }

    private int insertId(String sql, Object... args) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < args.length; i++) ps.setObject(i + 1, args[i]);
            return ps;
        }, kh);
        return kh.getKey().intValue();
    }

    private int employeeId(Account a) {
        Integer id = jdbc.queryForObject("SELECT employee_id FROM account WHERE account_id = ?", Integer.class, a.id);
        if (id == null) throw new OpsException(404, "NO_EMPLOYEE", "Không tìm thấy nhân viên.");
        return id;
    }

    private void emit(String type, Map<String, Object> data) { events.publishEvent(new OpsEvent(type, data)); }

    private static String label(String type, Integer tableNo, Integer queue) {
        if ("DINE_IN".equals(type)) return "Bàn " + tableNo;
        return queue == null ? "Mang đi" : String.format("#%03d", queue);
    }

    private static String iceToApi(String db) { return "LOW".equals(db) ? "LESS" : db; }

    private static String iceToDb(String api) { return "LESS".equals(api) ? "LOW" : api; }

    // ================= thực đơn, bàn =================
    private static final String SIZE_SQL = """
            SELECT s.item_id, s.size, s.price, s.status,
                   NOT EXISTS (SELECT 1 FROM recipe r JOIN recipe_line rl ON rl.recipe_id = r.recipe_id
                               JOIN v_available_stock v ON v.ingredient_id = rl.ingredient_id
                               WHERE r.item_id = s.item_id AND r.size = s.size AND rl.quantity > v.available_stock) AS stock_ok
            FROM item_size s""";

    private static final String TOPPING_SQL = """
            SELECT t.topping_id, t.name, t.surcharge, t.status,
                   NOT EXISTS (SELECT 1 FROM recipe r JOIN recipe_line rl ON rl.recipe_id = r.recipe_id
                               JOIN v_available_stock v ON v.ingredient_id = rl.ingredient_id
                               WHERE r.topping_id = t.topping_id AND rl.quantity > v.available_stock) AS stock_ok
            FROM topping t""";

    private record SizeRow(int itemId, String code, int price, String status, boolean stockOk) {
        boolean sellable() { return "SELLING".equals(status) && stockOk; }
    }

    private record ToppingRow(int id, String name, int price, String status, boolean stockOk) {
        boolean sellable() { return "SELLING".equals(status) && stockOk; }
    }

    private record ItemRow(int id, String name, String group, String status, boolean allowHot, boolean allowCold) {
        boolean cake() { return "CAKE".equals(group); }
        boolean hotOnly() { return allowHot && !allowCold; }
        boolean coldOnly() { return allowCold && !allowHot; }
        boolean takeaway() { return allowCold; }
    }

    private static ItemRow itemRow(ResultSet rs, int n) throws SQLException {
        return new ItemRow(rs.getInt("item_id"), rs.getString("name"), rs.getString("item_group"), rs.getString("status"),
                rs.getBoolean("allow_hot"), rs.getBoolean("allow_cold"));
    }

    private static SizeRow sizeRow(ResultSet rs, int n) throws SQLException {
        return new SizeRow(rs.getInt("item_id"), rs.getString("size"), rs.getInt("price"), rs.getString("status"), rs.getBoolean("stock_ok"));
    }

    private static ToppingRow toppingRow(ResultSet rs, int n) throws SQLException {
        return new ToppingRow(rs.getInt("topping_id"), rs.getString("name"), rs.getInt("surcharge"), rs.getString("status"), rs.getBoolean("stock_ok"));
    }

    private static String itemStatus(ItemRow m, List<SizeRow> sizes) {
        if ("STOPPED".equals(m.status)) return "DISCONTINUED";
        if ("OUT_OF_STOCK".equals(m.status)) return "OUT_OF_STOCK";
        return sizes.stream().anyMatch(SizeRow::sellable) ? "ACTIVE" : "OUT_OF_STOCK";
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> menu() {
        List<ItemRow> items = jdbc.query("SELECT item_id, name, item_group, status, allow_hot, allow_cold FROM menu_item ORDER BY item_id", Rows::item);
        Map<Integer, List<SizeRow>> sizes = new HashMap<>();
        for (SizeRow s : jdbc.query(SIZE_SQL + " ORDER BY s.item_id, s.size", Rows::size)) sizes.computeIfAbsent(s.itemId, k -> new ArrayList<>()).add(s);
        Map<Integer, List<Integer>> allowed = new HashMap<>();
        jdbc.query("SELECT item_id, topping_id FROM menu_item_topping ORDER BY item_id, topping_id",
                rs -> { allowed.computeIfAbsent(rs.getInt(1), k -> new ArrayList<>()).add(rs.getInt(2)); });
        List<Map<String, Object>> out = new ArrayList<>();
        for (ItemRow m : items) {
            List<SizeRow> ss = sizes.getOrDefault(m.id, List.of());
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("id", m.id); o.put("name", m.name); o.put("group", GROUP_LABEL.get(m.group)); o.put("status", itemStatus(m, ss));
            o.put("hotOnly", m.hotOnly()); o.put("coldOnly", m.coldOnly()); o.put("cake", m.cake()); o.put("takeaway", m.takeaway());
            o.put("sizes", ss.stream().map(s -> new Size(s.code, m.cake() ? "Phần" : s.code, s.price)).toList());
            o.put("toppingIds", allowed.getOrDefault(m.id, List.of()));
            Long v = images.version(MenuImageStore.Kind.ITEM, m.id);
            o.put("imageUrl", v == null ? null : "/api/ops/menu/" + m.id + "/image?v=" + v);
            out.add(o);
        }
        List<Topping> tops = new ArrayList<>();
        for (ToppingRow t : jdbc.query(TOPPING_SQL + " ORDER BY t.topping_id", Rows::topping)) {
            Topping x = new Topping(t.id, t.name, t.price, null, 0);
            x.status = !"SELLING".equals(t.status) || !t.stockOk ? ("STOPPED".equals(t.status) ? "DISCONTINUED" : "OUT_OF_STOCK") : "ACTIVE";
            Long tv = images.version(MenuImageStore.Kind.TOPPING, t.id);
            x.imageUrl = tv == null ? null : "/api/ops/menu/toppings/" + t.id + "/image?v=" + tv;
            tops.add(x);
        }
        return Map.of("items", out, "toppings", tops, "groups", List.of("Coffee", "Tea", "Smoothie", "Cake"));
    }

    /** Tham chiếu hàm ánh xạ (tránh viết lambda dài ở nhiều nơi). */
    private static final class Rows {
        static ItemRow item(ResultSet rs, int n) throws SQLException { return itemRow(rs, n); }
        static SizeRow size(ResultSet rs, int n) throws SQLException { return sizeRow(rs, n); }
        static ToppingRow topping(ResultSet rs, int n) throws SQLException { return toppingRow(rs, n); }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> tables() {
        return jdbc.query("""
                SELECT t.number, t.area, t.status, d.order_id FROM dining_table t
                LEFT JOIN dine_in_order d ON d.open_table_id = t.table_id ORDER BY t.number""", (rs, n) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("no", rs.getInt("number"));
            m.put("zone", "INDOOR".equals(rs.getString("area")) ? "Góc Hoài Niệm" : "Hiên Nắng");
            m.put("status", tableStatus(rs.getString("status")));
            int oid = rs.getInt("order_id");
            m.put("orderId", rs.wasNull() ? null : oid);
            return m;
        });
    }

    private static String tableStatus(String db) { return "WAITING_PAYMENT".equals(db) ? "WAITING_PAY" : db; }

    // ================= dựng dòng món =================
    private record NewLine(ItemRow item, SizeRow size, int qty, String temp, Integer sugar, String ice, List<ToppingRow> toppings) {
        int unitTotal() { return size.price + toppings.stream().mapToInt(ToppingRow::price).sum(); }
    }

    private NewLine buildLine(Map<String, Object> in, boolean takeaway) {
        int itemId = in.getOrDefault("itemId", -1) instanceof Number n ? n.intValue() : -1;
        ItemRow m = one("SELECT item_id, name, item_group, status, allow_hot, allow_cold FROM menu_item WHERE item_id = ?", Rows::item, itemId);
        if (m == null) throw new OpsException(422, "BAD_ITEM", "Món không tồn tại.");
        List<SizeRow> sizes = jdbc.query(SIZE_SQL + " WHERE s.item_id = ? ORDER BY s.size", Rows::size, itemId);
        String st = itemStatus(m, sizes);
        if (!st.equals("ACTIVE")) throw new OpsException(422, "ITEM_UNAVAILABLE", m.name + (st.equals("OUT_OF_STOCK") ? " đã hết hàng." : " đã ngừng bán."));
        int qty = in.get("qty") instanceof Number n ? n.intValue() : 0;
        if (qty < 1 || qty > 20) throw new OpsException(422, "BAD_QTY", "Số lượng từ 1 đến 20.");
        String sizeCode = String.valueOf(in.getOrDefault("size", sizes.get(0).code));
        SizeRow sz = sizes.stream().filter(s -> s.code.equals(sizeCode)).findFirst()
                .orElseThrow(() -> new OpsException(422, "BAD_SIZE", "Kích thước không hợp lệ."));
        if (!sz.sellable()) throw new OpsException(422, "ITEM_UNAVAILABLE", m.name + " (cỡ " + sz.code + ") đã hết hàng.");
        if (m.cake()) return new NewLine(m, sz, qty, null, null, null, List.of());
        String temp = String.valueOf(in.getOrDefault("temp", m.hotOnly() ? "HOT" : "COLD"));
        if (!temp.equals("HOT") && !temp.equals("COLD")) throw new OpsException(422, "BAD_TEMP", "Chọn nóng hoặc lạnh.");
        if (m.hotOnly() && temp.equals("COLD") || m.coldOnly() && temp.equals("HOT")) throw new OpsException(422, "BAD_TEMP", m.name + " không có lựa chọn này.");
        if (takeaway && temp.equals("HOT")) throw new OpsException(422, "TAKEAWAY_RULE", "Đơn mang đi chỉ bán đồ uống lạnh và bánh.");
        String sugar = String.valueOf(in.getOrDefault("sugar", "50"));
        if (!SUGARS.contains(sugar)) throw new OpsException(422, "BAD_SUGAR", "Mức đường không hợp lệ.");
        String ice = temp.equals("HOT") ? null : String.valueOf(in.getOrDefault("ice", "NORMAL"));
        if (ice != null && !ICES.contains(ice)) throw new OpsException(422, "BAD_ICE", "Mức đá không hợp lệ.");
        List<ToppingRow> tops = new ArrayList<>();
        if (in.get("toppings") instanceof List<?> ids) {
            Set<Integer> allowed = new LinkedHashSet<>(jdbc.queryForList("SELECT topping_id FROM menu_item_topping WHERE item_id = ?", Integer.class, itemId));
            for (Object o : ids) {
                int tid = o instanceof Number n ? n.intValue() : -1;
                ToppingRow t = one(TOPPING_SQL + " WHERE t.topping_id = ?", Rows::topping, tid);
                if (t == null || !allowed.contains(tid)) throw new OpsException(422, "BAD_TOPPING", "Topping không tồn tại hoặc không dùng được với món này.");
                if (!t.sellable()) throw new OpsException(422, "TOPPING_UNAVAILABLE", t.name + " đã hết hàng.");
                tops.add(t);
            }
        }
        return new NewLine(m, sz, qty, temp, Integer.valueOf(sugar), ice == null ? null : iceToDb(ice), tops);
    }

    /** Khuyến mãi áp dụng tại thời điểm xác nhận gửi (giờ địa phương), chốt vào dòng món (BR-019). Đơn nháp chưa chốt nên {@code promo = false}. */
    private PromotionService.Applied promotionFor(String group, boolean promo) {
        if (!promo) return null;
        java.time.ZonedDateTime now = java.time.ZonedDateTime.now(zone);
        return promotions.bestFor(group, now.toLocalDate(), now.toLocalTime().withSecond(0).withNano(0));
    }

    private int insertBatchWithLines(int orderId, List<NewLine> lines, boolean promo) {
        int batch = insertId("INSERT INTO order_batch (order_id, sent_at) VALUES (?, ?)", orderId, nowUtc());
        for (NewLine l : lines) {
            PromotionService.Applied p = promotionFor(l.item.group, promo);
            int id = insertId("""
                    INSERT INTO order_line (batch_id, item_id, size, quantity, temperature, sugar_level, ice_level, unit_price, discount_percent, promotion_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", batch, l.item.id, l.size.code, l.qty, l.temp, l.sugar, l.ice, l.size.price,
                    p == null ? 0 : p.percent(), p == null ? null : p.id());
            for (ToppingRow t : l.toppings) jdbc.update("INSERT INTO order_line_topping (line_id, topping_id, surcharge) VALUES (?, ?, ?)", id, t.id, t.price);
        }
        return batch;
    }

    /** Bánh trừ kho ngay khi xác nhận đơn (BR-009); thiếu thì dừng cả đơn. Dùng UPDATE có điều kiện để không bị tranh chấp. */
    private void takeCakes(List<NewLine> lines) {
        for (NewLine l : lines) {
            if (!l.item.cake()) continue;
            for (Map<String, Object> rl : cakeRecipe(l.item.id, l.size.code)) {
                BigDecimal need = ((BigDecimal) rl.get("quantity")).multiply(BigDecimal.valueOf(l.qty));
                int ok = jdbc.update("UPDATE ingredient SET current_stock = current_stock - ? WHERE ingredient_id = ? AND current_stock >= ?",
                        need, rl.get("ingredient_id"), need);
                if (ok == 0) throw new OpsException(409, "NOT_ENOUGH_STOCK", "Không đủ số lượng: " + rl.get("name") + ".");
            }
        }
    }

    private List<Map<String, Object>> cakeRecipe(int itemId, String size) {
        return jdbc.queryForList("""
                SELECT rl.ingredient_id, rl.quantity, i.name FROM recipe r JOIN recipe_line rl ON rl.recipe_id = r.recipe_id
                JOIN ingredient i ON i.ingredient_id = rl.ingredient_id WHERE r.item_id = ? AND r.size = ?""", itemId, size);
    }

    private void giveCake(int itemId, String size, int qty) {
        for (Map<String, Object> rl : cakeRecipe(itemId, size)) {
            jdbc.update("UPDATE ingredient SET current_stock = current_stock + ? WHERE ingredient_id = ?",
                    ((BigDecimal) rl.get("quantity")).multiply(BigDecimal.valueOf(qty)), rl.get("ingredient_id"));
        }
    }

    // ================= đọc đơn =================
    private record OrderRow(int id, String type, String status, Instant createdAt, String createdBy, Integer tableNo, String tableStatus,
                            Integer queue, Integer invoiceId, String invoiceMethod, Instant paidAt, Integer sessionId) {
        boolean paid() { return invoiceId != null; }
    }

    private static final String ORDER_SQL = """
            SELECT o.order_id, o.order_type, o.status, o.created_at, e.full_name, t.number AS table_no, t.status AS table_status,
                   tk.queue_number, i.invoice_id, i.payment_method AS inv_method, i.issued_at, i.session_id
            FROM orders o JOIN employee e ON e.employee_id = o.created_by
            LEFT JOIN dine_in_order d ON d.order_id = o.order_id LEFT JOIN dining_table t ON t.table_id = d.table_id
            LEFT JOIN takeaway_order tk ON tk.order_id = o.order_id
            LEFT JOIN invoice i ON i.order_id = o.order_id AND i.status = 'PAID'""";

    private static OrderRow orderRow(ResultSet rs, int n) throws SQLException {
        int tn = rs.getInt("table_no"); Integer tableNo = rs.wasNull() ? null : tn;
        int q = rs.getInt("queue_number"); Integer queue = rs.wasNull() ? null : q;
        int inv = rs.getInt("invoice_id"); Integer invoice = rs.wasNull() ? null : inv;
        int ss = rs.getInt("session_id"); Integer session = rs.wasNull() ? null : ss;
        return new OrderRow(rs.getInt("order_id"), rs.getString("order_type"), rs.getString("status"), instant(rs, "created_at"), rs.getString("full_name"),
                tableNo, rs.getString("table_status"), queue, invoice, rs.getString("inv_method"), instant(rs, "issued_at"), session);
    }

    private OrderRow orderRow(int id, boolean lock) {
        OrderRow r = one(ORDER_SQL + " WHERE o.order_id = ?" + (lock ? " FOR UPDATE" : ""), JdbcOpsService::orderRow, id);
        if (r == null) throw new OpsException(404, "NO_ORDER", "Không tìm thấy đơn.");
        return r;
    }

    private Order loadOrder(int id) {
        return toOrder(orderRow(id, false));
    }

    private Order toOrder(OrderRow r) {
        Order o = new Order();
        o.id = r.id;
        o.type = "DINE_IN".equals(r.type) ? "DINE" : "TAKEAWAY";
        o.tableNo = r.tableNo;
        o.seq = r.queue;
        o.status = r.paid() ? "PAID" : switch (r.status) { case "DRAFT" -> "DRAFT"; case "CANCELLED" -> "CANCELLED"; default -> "OPEN"; };
        o.waitingPay = "DINE_IN".equals(r.type) && !r.paid() && "WAITING_PAYMENT".equals(r.tableStatus) && !"CANCELLED".equals(r.status);
        o.payMethod = r.invoiceMethod == null ? null : ("TRANSFER_QR".equals(r.invoiceMethod) ? "TRANSFER" : r.invoiceMethod);
        o.invoiceNo = r.invoiceId == null ? null : String.format("HD%04d", r.invoiceId);
        o.shiftId = r.sessionId;
        o.createdBy = r.createdBy;
        o.createdAt = r.createdAt == null ? Instant.now() : r.createdAt;
        o.paidAt = r.paidAt;
        String tableLabel = "DRAFT".equals(r.status) ? null : label(r.type, r.tableNo, r.queue);
        Map<Integer, List<Object[]>> tops = new HashMap<>();
        jdbc.query("""
                SELECT olt.line_id, t.topping_id, t.name FROM order_line_topping olt JOIN topping t ON t.topping_id = olt.topping_id
                JOIN order_line l ON l.line_id = olt.line_id JOIN order_batch b ON b.batch_id = l.batch_id
                WHERE b.order_id = ? ORDER BY olt.line_id, t.topping_id""", rs -> {
            tops.computeIfAbsent(rs.getInt(1), k -> new ArrayList<>()).add(new Object[]{rs.getInt(2), rs.getString(3)});
        }, r.id);
        jdbc.query("""
                SELECT l.line_id, b.sent_at, l.item_id, m.name, m.item_group, l.size, l.quantity, l.temperature, l.sugar_level, l.ice_level,
                       l.unit_price, l.discount_percent, l.status, l.cancel_reason,
                       COALESCE((SELECT SUM(surcharge) FROM order_line_topping WHERE line_id = l.line_id), 0) AS tsur
                FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id JOIN menu_item m ON m.item_id = l.item_id
                WHERE b.order_id = ? ORDER BY l.line_id""", rs -> {
            Line l = new Line();
            l.id = rs.getInt("line_id"); l.orderId = r.id; l.itemId = rs.getInt("item_id"); l.name = rs.getString("name");
            l.cake = "CAKE".equals(rs.getString("item_group"));
            l.size = l.cake ? "Phần" : rs.getString("size");
            l.qty = rs.getInt("quantity"); l.status = rs.getString("status"); l.cancelReason = rs.getString("cancel_reason");
            l.unitPrice = rs.getInt("unit_price") + rs.getInt("tsur");
            l.discountPercent = rs.getInt("discount_percent");
            l.sentAt = instant(rs, "sent_at");
            l.tableLabel = tableLabel;
            if (!l.cake) {
                l.temp = rs.getString("temperature");
                int sg = rs.getInt("sugar_level"); l.sugar = rs.wasNull() ? null : String.valueOf(sg);
                String ice = rs.getString("ice_level"); l.ice = ice == null ? "-" : iceToApi(ice);
            }
            for (Object[] t : tops.getOrDefault(l.id, List.of())) { l.toppingIds.add((Integer) t[0]); l.toppings.add((String) t[1]); }
            o.lines.add(l);
        }, r.id);
        o.total = o.lines.stream().filter(l -> !l.status.equals("CANCELLED")).mapToInt(Line::total).sum();
        o.discount = o.lines.stream().filter(l -> !l.status.equals("CANCELLED")).mapToInt(l -> (int) PricingPolicy.promotionDiscount(l.total(), l.discountPercent)).sum();
        o.afterPromo = o.total - o.discount;
        o.rounded = PricingPolicy.roundToNearest500(o.afterPromo);
        o.maxPoints = PricingPolicy.maxRedeemablePoints(o.afterPromo);
        if (r.invoiceId != null) { // đã thanh toán: lấy số liệu chốt trên hóa đơn
            jdbc.query("""
                    SELECT i.total, i.promotion_discount, i.points_used, i.points_earned, c.full_name FROM invoice i
                    LEFT JOIN customer c ON c.customer_id = i.customer_id WHERE i.invoice_id = ?""", rs -> {
                o.rounded = rs.getInt(1); o.discount = rs.getInt(2); o.afterPromo = o.total - o.discount;
                o.pointsUsed = rs.getInt(3); o.pointsEarned = rs.getInt(4); o.customerName = rs.getString(5);
            }, r.invoiceId);
        }
        return o;
    }

    private Integer openOrderId(int tableId) {
        return one("SELECT order_id FROM dine_in_order WHERE open_table_id = ?", (rs, n) -> rs.getInt(1), tableId);
    }

    @Override
    @Transactional(readOnly = true)
    public Order orderAtTable(int table) {
        Integer id = one("SELECT d.order_id FROM dine_in_order d JOIN dining_table t ON t.table_id = d.open_table_id WHERE t.number = ?", (rs, n) -> rs.getInt(1), table);
        if (id == null) throw new OpsException(404, "NO_ORDER", "Bàn này chưa có đơn.");
        return loadOrder(id);
    }

    @Override
    @Transactional(readOnly = true)
    public Order get(int id) {
        return loadOrder(id);
    }

    // ================= Phục vụ =================
    @Override
    public Order send(int table, List<Map<String, Object>> in, Account by) {
        Map<String, Object> t = one("SELECT table_id, status FROM dining_table WHERE number = ? FOR UPDATE",
                (rs, n) -> Map.<String, Object>of("id", rs.getInt(1), "status", rs.getString(2)), table);
        if (t == null) throw new OpsException(404, "NO_TABLE", "Bàn không tồn tại.");
        if (in == null || in.isEmpty()) throw new OpsException(422, "EMPTY", "Đơn chưa có món nào.");
        int tableId = (Integer) t.get("id");
        Integer orderId = openOrderId(tableId);
        List<NewLine> lines = new ArrayList<>();
        for (Map<String, Object> m : in) lines.add(buildLine(m, false));
        takeCakes(lines);
        if (orderId != null && "WAITING_PAYMENT".equals(t.get("status")))
            jdbc.update("UPDATE dining_table SET status = 'SERVING' WHERE table_id = ?", tableId); // gọi thêm khi chờ thanh toán: bàn quay về Đang phục vụ (BR-001)
        if (orderId == null) {
            orderId = insertId("INSERT INTO orders (order_type, status, created_at, created_by) VALUES ('DINE_IN', 'PROCESSING', ?, ?)", nowUtc(), employeeId(by));
            jdbc.update("INSERT INTO dine_in_order (order_id, table_id) VALUES (?, ?)", orderId, tableId);
            jdbc.update("UPDATE dining_table SET status = 'SERVING' WHERE table_id = ?", tableId);
        } else {
            jdbc.update("UPDATE orders SET status = 'PROCESSING' WHERE order_id = ? AND status = 'DONE'", orderId);
        }
        insertBatchWithLines(orderId, lines, true);
        Order o = loadOrder(orderId);
        emit("ORDER_SENT", Map.of("orderId", orderId, "label", "Bàn " + table, "lines", lines.size()));
        return o;
    }

    @Override
    public Order cancelLine(int orderId, int lineId, String reason, Account by) {
        OrderRow o = orderRow(orderId, true);
        Map<String, Object> l = one("""
                SELECT l.status, l.item_id, l.size, l.quantity, m.item_group, m.name FROM order_line l
                JOIN order_batch b ON b.batch_id = l.batch_id JOIN menu_item m ON m.item_id = l.item_id
                WHERE l.line_id = ? AND b.order_id = ? FOR UPDATE""", (rs, n) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("status", rs.getString(1)); m.put("item", rs.getInt(2)); m.put("size", rs.getString(3)); m.put("qty", rs.getInt(4));
            m.put("group", rs.getString(5)); m.put("name", rs.getString(6));
            return m;
        }, lineId, orderId);
        if (l == null) throw new OpsException(404, "NO_LINE", "Không tìm thấy dòng món.");
        String status = (String) l.get("status");
        if (status.equals("CANCELLED") || status.equals("DONE")) throw new OpsException(409, "CANNOT_CANCEL", "Món này không thể hủy nữa.");
        if (o.paid() || o.status.equals("CANCELLED")) throw new OpsException(409, "CANNOT_CANCEL", "Đơn đã đóng, không thể hủy món.");
        if (status.equals("MAKING")) {
            if (by.role != vn.vtph.coffee.auth.Role.OWNER) throw new OpsException(403, "OWNER_ONLY", "Món đang pha, chỉ Chủ quán/Quản lý được hủy.");
            if (reason == null || reason.isBlank()) throw new OpsException(422, "REASON_REQUIRED", "Vui lòng nhập lý do.");
        } else if ("CAKE".equals(l.get("group"))) {
            giveCake((Integer) l.get("item"), (String) l.get("size"), (Integer) l.get("qty"));
        }
        int emp = employeeId(by);
        jdbc.update("UPDATE order_line SET status = 'CANCELLED', cancel_reason = ?, cancelled_by = ?, cancelled_at = ? WHERE line_id = ?",
                reason, emp, nowUtc(), lineId);
        if (status.equals("MAKING")) recordCancelWaste(lineId, emp);
        Integer alive = jdbc.queryForObject("""
                SELECT COUNT(*) FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id WHERE b.order_id = ? AND l.status <> 'CANCELLED'""", Integer.class, orderId);
        if (alive == 0 && o.type.equals("DINE_IN")) {
            jdbc.update("UPDATE orders SET status = 'CANCELLED' WHERE order_id = ?", orderId); // trigger nhả bàn
            jdbc.update("UPDATE dining_table t JOIN dine_in_order d ON d.table_id = t.table_id SET t.status = 'EMPTY' WHERE d.order_id = ?", orderId);
        }
        Order out = loadOrder(orderId);
        emit("LINE_CANCELLED", Map.of("orderId", orderId, "lineId", lineId, "label", label(o.type, o.tableNo, o.queue), "name", l.get("name")));
        return out;
    }

    /** BR-012: món đã Making bị hủy thì nguyên liệu đã tiêu hao không hoàn kho mà ghi nhận là hao hụt với lý do "Hủy món". */
    private void recordCancelWaste(int lineId, int emp) {
        for (Map<String, Object> r : jdbc.queryForList("""
                SELECT u.ingredient_id, SUM(u.q) AS q FROM (
                  SELECT rl.ingredient_id, rl.quantity * l.quantity AS q FROM order_line l
                    JOIN recipe r ON r.item_id = l.item_id AND r.size = l.size JOIN recipe_line rl ON rl.recipe_id = r.recipe_id WHERE l.line_id = ?
                  UNION ALL
                  SELECT rl.ingredient_id, rl.quantity * l.quantity FROM order_line l JOIN order_line_topping t ON t.line_id = l.line_id
                    JOIN recipe r ON r.topping_id = t.topping_id JOIN recipe_line rl ON rl.recipe_id = r.recipe_id WHERE l.line_id = ?
                ) u GROUP BY u.ingredient_id""", lineId, lineId)) {
            jdbc.update("""
                    INSERT INTO waste_record (ingredient_id, quantity, reason, status, created_at, created_by, confirmed_at, confirmed_by)
                    VALUES (?, ?, 'Hủy món', 'CONFIRMED', ?, ?, ?, ?)""", r.get("ingredient_id"), r.get("q"), nowUtc(), emp, nowUtc(), emp);
        }
    }

    @Override
    public Order move(int orderId, int to) {
        OrderRow o = orderRow(orderId, true);
        if (!o.type.equals("DINE_IN") || o.paid() || o.status.equals("CANCELLED")) throw new OpsException(409, "CANNOT_MOVE", "Không thể chuyển bàn cho đơn này.");
        Integer target = one("SELECT table_id FROM dining_table WHERE number = ? FOR UPDATE", (rs, n) -> rs.getInt(1), to);
        if (target == null) throw new OpsException(404, "NO_TABLE", "Bàn không tồn tại.");
        if (openOrderId(target) != null) throw new OpsException(409, "TABLE_BUSY", "Bàn " + to + " không còn trống. Vui lòng chọn bàn khác.");
        Map<String, Object> from = one("SELECT d.table_id, t.status FROM dine_in_order d JOIN dining_table t ON t.table_id = d.table_id WHERE d.order_id = ?",
                (rs, n) -> Map.<String, Object>of("id", rs.getInt(1), "status", rs.getString(2)), orderId);
        jdbc.update("UPDATE dine_in_order SET table_id = ?, open_table_id = ? WHERE order_id = ?", target, target, orderId);
        jdbc.update("UPDATE dining_table SET status = 'EMPTY' WHERE table_id = ?", from.get("id"));
        jdbc.update("UPDATE dining_table SET status = ? WHERE table_id = ?", from.get("status"), target);
        return loadOrder(orderId);
    }

    @Override
    public Order finish(int orderId) {
        OrderRow o = orderRow(orderId, true);
        if (!o.type.equals("DINE_IN") || o.paid() || o.status.equals("CANCELLED")) throw new OpsException(409, "CANNOT_FINISH", "Không thể thực hiện với đơn này.");
        Integer busy = jdbc.queryForObject("""
                SELECT COUNT(*) FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id WHERE b.order_id = ? AND l.status IN ('NEW','MAKING')""", Integer.class, orderId);
        if (busy > 0) throw new OpsException(409, "LINES_PENDING", "Còn món chưa hoàn thành hoặc chưa hủy.");
        jdbc.update("UPDATE orders SET status = 'DONE' WHERE order_id = ?", orderId);
        jdbc.update("UPDATE dining_table t JOIN dine_in_order d ON d.table_id = t.table_id SET t.status = 'WAITING_PAYMENT' WHERE d.order_id = ?", orderId);
        Order out = loadOrder(orderId);
        emit("TABLE_WAITING_PAY", Map.of("orderId", orderId, "label", label(o.type, o.tableNo, o.queue)));
        return out;
    }

    // ================= Pha chế =================
    private List<String> shortage(int lineId) {
        return jdbc.queryForList("""
                SELECT i.name FROM ingredient i JOIN (
                  SELECT u.ingredient_id, SUM(u.need) AS need FROM (
                    SELECT rl.ingredient_id, rl.quantity * l.quantity AS need FROM order_line l
                      JOIN recipe r ON r.item_id = l.item_id AND r.size = l.size JOIN recipe_line rl ON rl.recipe_id = r.recipe_id WHERE l.line_id = ?
                    UNION ALL
                    SELECT rl.ingredient_id, rl.quantity * l.quantity FROM order_line l JOIN order_line_topping t ON t.line_id = l.line_id
                      JOIN recipe r ON r.topping_id = t.topping_id JOIN recipe_line rl ON rl.recipe_id = r.recipe_id WHERE l.line_id = ?
                  ) u GROUP BY u.ingredient_id) n ON n.ingredient_id = i.ingredient_id
                WHERE i.current_stock < n.need ORDER BY i.ingredient_id""", String.class, lineId, lineId);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> kitchen() {
        List<Map<String, Object>> out = jdbc.query("""
                SELECT l.line_id, o.order_id, o.order_type, t.number AS table_no, tk.queue_number, m.name, m.item_group, l.size, l.quantity,
                       l.temperature, l.sugar_level, l.ice_level, l.status, b.sent_at
                FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id JOIN orders o ON o.order_id = b.order_id
                JOIN menu_item m ON m.item_id = l.item_id
                LEFT JOIN dine_in_order d ON d.order_id = o.order_id LEFT JOIN dining_table t ON t.table_id = d.table_id
                LEFT JOIN takeaway_order tk ON tk.order_id = o.order_id
                WHERE o.status NOT IN ('DRAFT', 'CANCELLED') AND l.status <> 'CANCELLED'
                ORDER BY b.sent_at, l.line_id""", (rs, n) -> {
            boolean cake = "CAKE".equals(rs.getString("item_group"));
            int lid = rs.getInt("line_id");
            Map<String, Object> m = new LinkedHashMap<>();
            int tn = rs.getInt("table_no"); Integer tableNo = rs.wasNull() ? null : tn;
            int qn = rs.getInt("queue_number"); Integer queue = rs.wasNull() ? null : qn;
            m.put("id", lid); m.put("orderId", rs.getInt("order_id")); m.put("label", label(rs.getString("order_type"), tableNo, queue));
            m.put("name", rs.getString("name")); m.put("qty", rs.getInt("quantity")); m.put("size", cake ? "Phần" : rs.getString("size"));
            String temp = rs.getString("temperature");
            m.put("temp", temp);
            int sg = rs.getInt("sugar_level"); m.put("sugar", rs.wasNull() ? null : String.valueOf(sg));
            String ice = rs.getString("ice_level"); m.put("ice", cake ? null : (ice == null ? "-" : iceToApi(ice)));
            m.put("toppings", jdbc.queryForList("SELECT t.name FROM order_line_topping x JOIN topping t ON t.topping_id = x.topping_id WHERE x.line_id = ? ORDER BY t.topping_id", String.class, lid));
            m.put("cake", cake); m.put("status", rs.getString("status")); m.put("sentAt", instant(rs, "sent_at").toString());
            m.put("canStart", rs.getString("status").equals("NEW") && (cake || shortage(lid).isEmpty()));
            return m;
        });
        return Map.of("lines", out);
    }

    /** UC-14: New → Making và trừ kho đồ uống qua sp_start_making. Thiếu nguyên liệu: giữ nguyên dòng, đánh dấu cỡ Hết hàng (BR-010) và vẫn lưu dấu đó. */
    @Override
    @Transactional(noRollbackFor = OpsException.class)
    public Map<String, Object> start(int lineId) {
        Map<String, Object> l = one("""
                SELECT l.status, m.item_group, l.item_id, l.size, l.batch_id, m.name, o.status FROM order_line l JOIN menu_item m ON m.item_id = l.item_id
                JOIN order_batch b ON b.batch_id = l.batch_id JOIN orders o ON o.order_id = b.order_id
                WHERE l.line_id = ? FOR UPDATE""", (rs, n) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("status", rs.getString(1)); m.put("group", rs.getString(2)); m.put("item", rs.getInt(3)); m.put("size", rs.getString(4)); m.put("batch", rs.getInt(5)); m.put("name", rs.getString(6));
            m.put("orderStatus", rs.getString(7));
            return m;
        }, lineId);
        if (l == null) throw new OpsException(404, "NO_LINE", "Không tìm thấy dòng món.");
        if (!l.get("status").equals("NEW")) throw new OpsException(409, "BAD_STATE", "Món này không còn ở trạng thái Mới.");
        // BR-004/BR-014: đơn nháp (chưa xác nhận thanh toán) hoặc đơn đã hủy không được chuyển món sang pha chế.
        if (!"PROCESSING".equals(l.get("orderStatus"))) throw new OpsException(409, "ORDER_NOT_ACTIVE", "Đơn chưa được xác nhận hoặc đã hủy, không thể pha món này.");
        if (!"CAKE".equals(l.get("group"))) {
            List<String> lack = shortage(lineId);
            if (!lack.isEmpty()) {
                markShortage(lineId, (Integer) l.get("item"), (String) l.get("size"));
                OrderInfo info = orderOfBatch((Integer) l.get("batch"));
                emit("LINE_SHORTAGE", Map.of("orderId", info.id, "lineId", lineId, "label", info.label, "name", l.get("name")));
                throw new OpsException(409, "SHORTAGE", "Thiếu nguyên liệu: " + String.join(", ", lack) + ".", Map.of("ingredients", lack));
            }
        }
        try {
            jdbc.update("CALL sp_start_making(?)", lineId);
        } catch (DataAccessException e) {
            throw new OpsException(409, "BAD_STATE", "Không thể bắt đầu pha món này.");
        }
        OrderInfo oi = orderOfBatch((Integer) l.get("batch"));
        emit("LINE_MAKING", Map.of("orderId", oi.id, "lineId", lineId, "label", oi.label, "name", l.get("name")));
        return Map.of("ok", true);
    }

    private record OrderInfo(int id, String label) {}

    private OrderInfo orderOfBatch(int batchId) {
        return one("""
                SELECT o.order_id, o.order_type, t.number, tk.queue_number FROM order_batch b JOIN orders o ON o.order_id = b.order_id
                LEFT JOIN dine_in_order d ON d.order_id = o.order_id LEFT JOIN dining_table t ON t.table_id = d.table_id
                LEFT JOIN takeaway_order tk ON tk.order_id = o.order_id WHERE b.batch_id = ?""", (rs, n) -> {
            int tn = rs.getInt(3); Integer tableNo = rs.wasNull() ? null : tn;
            int q = rs.getInt(4); Integer queue = rs.wasNull() ? null : q;
            return new OrderInfo(rs.getInt(1), label(rs.getString(2), tableNo, queue));
        }, batchId);
    }

    /**
     * BR-010: thiếu nguyên liệu khi chuyển sang Making thì chuyển kích thước hoặc topping thiếu sang Hết hàng (do hệ thống đặt).
     * Topping nào của dòng này tự thiếu thì đánh dấu topping; còn lại (hoặc thiếu do công thức món) đánh dấu kích thước.
     */
    private void markShortage(int lineId, int itemId, String size) {
        List<Integer> tops = jdbc.queryForList("""
                SELECT DISTINCT t.topping_id FROM order_line l JOIN order_line_topping t ON t.line_id = l.line_id
                  JOIN recipe r ON r.topping_id = t.topping_id JOIN recipe_line rl ON rl.recipe_id = r.recipe_id
                  JOIN ingredient i ON i.ingredient_id = rl.ingredient_id
                WHERE l.line_id = ? AND i.current_stock < rl.quantity * l.quantity""", Integer.class, lineId);
        for (Integer tid : tops)
            jdbc.update("UPDATE topping SET status = 'OUT_OF_STOCK', status_source = 'SYSTEM' WHERE topping_id = ? AND status = 'SELLING'", tid);
        Integer sizeLack = jdbc.queryForObject("""
                SELECT COUNT(*) FROM order_line l JOIN recipe r ON r.item_id = l.item_id AND r.size = l.size
                  JOIN recipe_line rl ON rl.recipe_id = r.recipe_id JOIN ingredient i ON i.ingredient_id = rl.ingredient_id
                WHERE l.line_id = ? AND i.current_stock < rl.quantity * l.quantity""", Integer.class, lineId);
        if (tops.isEmpty() || sizeLack > 0)
            jdbc.update("UPDATE item_size SET status = 'OUT_OF_STOCK', status_source = 'SYSTEM' WHERE item_id = ? AND size = ?", itemId, size);
    }

    @Override
    public Map<String, Object> done(int lineId) {
        Map<String, Object> l = one("""
                SELECT l.status, l.batch_id, l.quantity, m.name FROM order_line l JOIN menu_item m ON m.item_id = l.item_id WHERE l.line_id = ? FOR UPDATE""",
                (rs, n) -> Map.<String, Object>of("status", rs.getString(1), "batch", rs.getInt(2), "qty", rs.getInt(3), "name", rs.getString(4)), lineId);
        if (l == null) throw new OpsException(404, "NO_LINE", "Không tìm thấy dòng món.");
        if (!l.get("status").equals("MAKING")) throw new OpsException(409, "BAD_STATE", "Chỉ hoàn thành được món đang pha.");
        jdbc.update("UPDATE order_line SET status = 'DONE' WHERE line_id = ?", lineId);
        OrderInfo oi = orderOfBatch((Integer) l.get("batch"));
        // Đơn mang đi: xong hết các dòng thì đơn chuyển Done (đơn tại quán chuyển Done khi Phục vụ xác nhận, UC-11)
        jdbc.update("""
                UPDATE orders o JOIN takeaway_order tk ON tk.order_id = o.order_id SET o.status = 'DONE'
                WHERE o.order_id = ? AND o.status = 'PROCESSING' AND NOT EXISTS (
                  SELECT 1 FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id WHERE b.order_id = o.order_id AND l.status IN ('NEW','MAKING'))""", oi.id);
        emit("LINE_DONE", Map.of("orderId", oi.id, "lineId", lineId, "label", oi.label, "name", l.get("name"), "qty", l.get("qty")));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", true); out.put("label", oi.label); out.put("name", l.get("name"));
        return out;
    }

    // ================= Ca thu ngân =================
    private static Shift shift(ResultSet rs, int n) throws SQLException {
        Shift s = new Shift();
        s.id = rs.getInt("session_id"); s.type = rs.getString("shift"); s.openingCash = rs.getInt("opening_cash");
        int a = rs.getInt("actual_cash"); s.actualCash = rs.wasNull() ? null : a;
        int e = rs.getInt("expected_cash"); s.expectedCash = rs.wasNull() ? null : e;
        int d = rs.getInt("difference"); s.diff = rs.wasNull() ? null : d;
        s.openedAt = instant(rs, "opened_at"); s.closedAt = instant(rs, "closed_at");
        s.open = "OPEN".equals(rs.getString("status")); s.openedBy = rs.getString("full_name");
        return s;
    }

    private static final String SHIFT_SQL = """
            SELECT s.*, e.full_name FROM cashier_session s JOIN employee e ON e.employee_id = s.opened_by""";

    private Shift openSession() {
        return one(SHIFT_SQL + " WHERE s.status = 'OPEN'", JdbcOpsService::shift);
    }

    private int cashSales(int sessionId) {
        return jdbc.queryForObject("""
                SELECT COALESCE(SUM(total), 0) - COALESCE((SELECT SUM(r.cash_amount) FROM refund_record r JOIN invoice x ON x.invoice_id = r.invoice_id
                  WHERE x.session_id = ? AND x.payment_method = 'CASH' AND x.status = 'PAID' AND r.type = 'PARTIAL'), 0)
                FROM invoice WHERE session_id = ? AND payment_method = 'CASH' AND status = 'PAID'""", Integer.class, sessionId, sessionId);
    }

    private int draftCount() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE status = 'DRAFT'", Integer.class);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> shiftState() {
        Shift s = openSession();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("open", s != null);
        m.put("shift", s);
        m.put("lastClosed", one(SHIFT_SQL + " WHERE s.status = 'CLOSED' ORDER BY s.closed_at DESC, s.session_id DESC LIMIT 1", JdbcOpsService::shift));
        if (s != null) {
            int cash = cashSales(s.id);
            m.put("cashSales", cash); m.put("expected", s.openingCash + cash); m.put("drafts", draftCount());
        }
        return m;
    }

    /** UC-30: mở ca. Một ca mở tại một thời điểm; mỗi ca (sáng/tối) chỉ mở một lần trong ngày kinh doanh. */
    @Override
    public Shift openShift(String type, Integer cash, Account by) {
        if (openSession() != null) throw new OpsException(409, "SHIFT_OPEN", "Đã có phiên ca đang mở, hãy chốt ca trước.");
        if (!List.of("MORNING", "EVENING").contains(type)) throw new OpsException(422, "BAD_TYPE", "Chọn ca sáng hoặc ca tối.");
        if (cash == null || cash < 0) throw new OpsException(422, "BAD_CASH", "Tiền mặt đầu ca không hợp lệ.");
        LocalDate day = today();
        // Không dùng ON DUPLICATE KEY UPDATE: trigger chặn mọi UPDATE trên ngày đã chốt (BR-038) nên sẽ báo lỗi trigger thay vì thông điệp rõ ràng.
        String dayStatus = one("SELECT status FROM business_day WHERE business_date = ?", (rs, n) -> rs.getString(1), day);
        if ("CLOSED".equals(dayStatus)) throw new OpsException(409, "DAY_CLOSED", "Ngày kinh doanh đã chốt, không mở thêm ca.");
        if (dayStatus == null) jdbc.update("INSERT INTO business_day (business_date, status) VALUES (?, 'OPEN')", day);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM cashier_session WHERE business_date = ? AND shift = ?", Integer.class, day, type) > 0)
            throw new OpsException(409, "SHIFT_EXISTS", "Ca này đã mở trong ngày.");
        int id = insertId("INSERT INTO cashier_session (business_date, shift, opening_cash, opened_at, opened_by) VALUES (?, ?, ?, ?, ?)",
                day, type, cash, nowUtc(), employeeId(by));
        return one(SHIFT_SQL + " WHERE s.session_id = ?", JdbcOpsService::shift, id);
    }

    /**
     * UC-31: chốt ca. Mọi ca bị chặn khi còn đơn nháp chuyển khoản/QR. Ca sáng bàn giao đơn đang mở sang ca tối (ASM-35);
     * ca tối còn bị chặn khi còn đơn mở hoặc bàn chưa Trống (BR-037, ASM-46) và liệt kê các mục cần xử lý.
     */
    @Override
    public Shift closeShift(Integer actual, Account by) {
        Shift s = openSession();
        if (s == null) throw new OpsException(409, "NO_SHIFT", "Chưa mở ca thu ngân.");
        int d = draftCount();
        if (d > 0) throw new OpsException(409, "DRAFTS_PENDING", "Còn " + d + " đơn nháp, hãy xác nhận hoặc hủy trước khi chốt ca.");
        if ("EVENING".equals(s.type)) {
            List<Map<String, Object>> orders = openWork.orders(), tables = openWork.busyTables();
            if (!orders.isEmpty() || !tables.isEmpty())
                throw new OpsException(409, "OPEN_ORDERS", "Còn " + orders.size() + " đơn mở và " + tables.size() + " bàn chưa Trống, hãy xử lý trước khi chốt ca tối.",
                        Map.of("orders", orders, "tables", tables));
        }
        if (actual == null || actual < 0) throw new OpsException(422, "BAD_CASH", "Vui lòng nhập tiền mặt kiểm đếm thực tế.");
        int expected = s.openingCash + cashSales(s.id);
        jdbc.update("""
                UPDATE cashier_session SET status = 'CLOSED', closed_at = ?, closed_by = ?, expected_cash = ?, actual_cash = ?, difference = ?
                WHERE session_id = ? AND status = 'OPEN'""", nowUtc(), employeeId(by), expected, actual, actual - expected, s.id);
        return one(SHIFT_SQL + " WHERE s.session_id = ?", JdbcOpsService::shift, s.id);
    }

    // ================= Thanh toán =================
    @Override
    @Transactional(readOnly = true)
    public List<Order> pending() {
        List<Integer> ids = jdbc.queryForList("""
                SELECT o.order_id FROM orders o JOIN dine_in_order d ON d.order_id = o.order_id JOIN dining_table t ON t.table_id = d.table_id
                WHERE o.order_type = 'DINE_IN' AND o.status IN ('PROCESSING', 'DONE') AND NOT EXISTS (SELECT 1 FROM invoice i WHERE i.order_id = o.order_id)
                ORDER BY (t.status = 'WAITING_PAYMENT') DESC, o.order_id""", Integer.class);
        return ids.stream().map(this::loadOrder).toList();
    }

    private void validatePayment(int rounded, String method, Integer received) {
        if (rounded <= 0) throw new OpsException(422, "ZERO", "Đơn không có số tiền cần thanh toán.");
        if ("CASH".equals(method)) {
            if (received == null || received < rounded) throw new OpsException(422, "NOT_ENOUGH_CASH", "Tiền khách đưa chưa đủ " + rounded + "đ.");
        } else if (!"TRANSFER".equals(method)) {
            throw new OpsException(422, "BAD_METHOD", "Chọn tiền mặt hoặc chuyển khoản/QR.");
        }
    }

    /** Tiền món (giá + topping) và khuyến mãi đã chốt trên từng dòng chưa hủy (BR-021 bước 1 - 2). */
    private record Amounts(int subtotal, int discount) {
        int afterPromo() { return subtotal - discount; }
    }

    private Amounts amounts(int orderId) {
        int[] t = new int[2];
        jdbc.query("""
                SELECT (l.unit_price + COALESCE((SELECT SUM(surcharge) FROM order_line_topping WHERE line_id = l.line_id), 0)) * l.quantity, l.discount_percent
                FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id WHERE b.order_id = ? AND l.status <> 'CANCELLED'""", rs -> {
            long value = rs.getLong(1);
            t[0] += (int) value;
            t[1] += (int) PricingPolicy.promotionDiscount(value, rs.getInt(2));
        }, orderId);
        return new Amounts(t[0], t[1]);
    }

    private record Member(int id, int points) {}

    /** Tính tiền theo thứ tự BR-021: giá món, khuyến mãi, điểm, làm tròn 500đ, rồi tích điểm trên số tiền thực trả; phát hành hóa đơn. */
    private void settle(int orderId, int sessionId, String method, Integer received, Account by, Payer payer) {
        Payer p = payer == null ? Payer.NONE : payer;
        Amounts a = amounts(orderId);
        Member m = null;
        if (p.customerId() != null) {
            m = one("SELECT customer_id, points FROM customer WHERE customer_id = ? FOR UPDATE", (rs, n) -> new Member(rs.getInt(1), rs.getInt(2)), p.customerId());
            if (m == null) throw new OpsException(404, "NO_CUSTOMER", "Không tìm thấy thành viên.");
        }
        if (p.points() < 0) throw new OpsException(422, "BAD_POINTS", "Số điểm dùng không hợp lệ.");
        if (p.points() > 0) {
            if (m == null) throw new OpsException(422, "NO_CUSTOMER", "Cần chọn thành viên để dùng điểm.");
            if (p.points() > m.points()) throw new OpsException(422, "NOT_ENOUGH_POINTS", "Thành viên chỉ có " + m.points() + " điểm.");
            if (p.points() > PricingPolicy.maxRedeemablePoints(a.afterPromo()))
                throw new OpsException(422, "POINTS_LIMIT", "Chỉ được dùng tối đa " + PricingPolicy.maxRedeemablePoints(a.afterPromo()) + " điểm (30% giá trị đơn sau khuyến mãi).");
        }
        int rounded = PricingPolicy.payableAfterPoints(a.afterPromo(), p.points());
        validatePayment(rounded, method, received);
        int earned = m == null ? 0 : PricingPolicy.pointsEarned(rounded);
        int invoice = insertId("""
                INSERT INTO invoice (order_id, session_id, customer_id, payment_method, subtotal, promotion_discount, points_used, total, points_earned, issued_at, issued_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", orderId, sessionId, m == null ? null : m.id(), "TRANSFER".equals(method) ? "TRANSFER_QR" : "CASH",
                a.afterPromo(), a.discount(), p.points(), rounded, earned, nowUtc(), employeeId(by));
        if (m != null) {
            if (p.points() > 0) jdbc.update("INSERT INTO point_transaction (customer_id, invoice_id, type, points, created_at) VALUES (?, ?, 'REDEEM', ?, ?)", m.id(), invoice, p.points(), nowUtc());
            if (earned > 0) jdbc.update("INSERT INTO point_transaction (customer_id, invoice_id, type, points, created_at) VALUES (?, ?, 'EARN', ?, ?)", m.id(), invoice, earned, nowUtc());
            jdbc.update("UPDATE customer SET points = points - ? + ? WHERE customer_id = ?", p.points(), earned, m.id());
        }
    }

    /** UC-22: thanh toán đơn tại quán đang Chờ thanh toán. */
    @Override
    public Order pay(int orderId, String method, Integer received, Account by) { return pay(orderId, method, received, by, Payer.NONE); }

    @Override
    public Order pay(int orderId, String method, Integer received, Account by, Payer payer) {
        OrderRow o = orderRow(orderId, true);
        Shift s = openSession();
        if (s == null) throw new OpsException(409, "NO_SHIFT", "Chưa mở ca thu ngân.");
        boolean waiting = "WAITING_PAYMENT".equals(o.tableStatus);
        if (!o.type.equals("DINE_IN") || o.paid() || o.status.equals("CANCELLED") || !waiting)
            throw new OpsException(409, "NOT_PAYABLE", "Đơn này chưa ở trạng thái Chờ thanh toán.");
        settle(orderId, s.id, method, received, by, payer);
        jdbc.update("UPDATE dining_table t JOIN dine_in_order d ON d.table_id = t.table_id SET t.status = 'EMPTY' WHERE d.order_id = ?", orderId);
        return paidView(orderId, method, received, o);
    }

    private Order paidView(int orderId, String method, Integer received, OrderRow before) {
        Order out = loadOrder(orderId);
        if ("CASH".equals(method)) { out.received = received; out.change = received - out.rounded; }
        else { out.received = out.rounded; out.change = 0; }
        emit("ORDER_PAID", Map.of("orderId", orderId, "label", label(before.type, before.tableNo, before.queue), "invoiceNo", out.invoiceNo));
        return out;
    }

    private int nextQueue() {
        LocalDate day = today();
        Integer max = jdbc.queryForObject("SELECT COALESCE(MAX(queue_number), 0) FROM takeaway_order WHERE queue_date = ? FOR UPDATE", Integer.class, day);
        return max + 1;
    }

    /** UC-12: đơn mang đi. Tiền mặt: thanh toán ngay. Chuyển khoản/QR: tạo đơn nháp chờ Thu ngân xác nhận. */
    @Override
    public Order takeaway(List<Map<String, Object>> in, String method, Integer received, Account by) { return takeaway(in, method, received, by, Payer.NONE); }

    @Override
    public Order takeaway(List<Map<String, Object>> in, String method, Integer received, Account by, Payer payer) {
        Shift s = openSession();
        if (s == null) throw new OpsException(409, "NO_SHIFT", "Chưa mở ca thu ngân.");
        if (in == null || in.isEmpty()) throw new OpsException(422, "EMPTY", "Đơn chưa có món nào.");
        List<NewLine> lines = new ArrayList<>();
        for (Map<String, Object> m : in) {
            int itemId = m.getOrDefault("itemId", -1) instanceof Number n ? n.intValue() : -1;
            ItemRow mi = one("SELECT item_id, name, item_group, status, allow_hot, allow_cold FROM menu_item WHERE item_id = ?", Rows::item, itemId);
            if (mi != null && !mi.takeaway()) throw new OpsException(422, "TAKEAWAY_RULE", "Đơn mang đi chỉ bán đồ uống lạnh và bánh.");
            lines.add(buildLine(m, true));
        }
        int emp = employeeId(by);
        if ("TRANSFER".equals(method)) {
            int id = insertId("INSERT INTO orders (order_type, status, created_at, created_by) VALUES ('TAKEAWAY', 'DRAFT', ?, ?)", nowUtc(), emp);
            Payer dp = payer == null ? Payer.NONE : payer;
            jdbc.update("INSERT INTO takeaway_order (order_id, payment_method, quoted_total, customer_id, points_to_use) VALUES (?, 'TRANSFER_QR', ?, ?, ?)",
                    id, quoteDraftTotal(lines, dp), dp.customerId(), dp.points());
            insertBatchWithLines(id, lines, false); // khuyến mãi chốt khi thu ngân xác nhận (BR-019)
            return loadOrder(id);
        }
        if (!"CASH".equals(method)) throw new OpsException(422, "BAD_METHOD", "Chọn tiền mặt hoặc chuyển khoản/QR.");
        takeCakes(lines);
        int id = insertId("INSERT INTO orders (order_type, status, created_at, created_by) VALUES ('TAKEAWAY', 'PROCESSING', ?, ?)", nowUtc(), emp);
        jdbc.update("INSERT INTO takeaway_order (order_id, queue_date, queue_number, payment_method) VALUES (?, ?, ?, 'CASH')", id, today(), nextQueue());
        insertBatchWithLines(id, lines, true);
        settle(id, s.id, method, received, by, payer);
        OrderRow row = orderRow(id, false);
        Order out = paidView(id, method, received, row);
        emit("ORDER_SENT", Map.of("orderId", id, "label", label(row.type, row.tableNo, row.queue), "lines", lines.size()));
        return out;
    }

    /** ASM-03: số tiền khách phải chuyển khoản tại thời điểm tạo đơn nháp (sau khuyến mãi, điểm và làm tròn 500đ). */
    private int quoteDraftTotal(List<NewLine> lines, Payer p) {
        if (p.points() < 0) throw new OpsException(422, "BAD_POINTS", "Số điểm dùng không hợp lệ.");
        if (p.customerId() != null && one("SELECT customer_id FROM customer WHERE customer_id = ?", (rs, n) -> rs.getInt(1), p.customerId()) == null)
            throw new OpsException(404, "NO_CUSTOMER", "Không tìm thấy thành viên.");
        if (p.points() > 0 && p.customerId() == null) throw new OpsException(422, "NO_CUSTOMER", "Cần chọn thành viên để dùng điểm.");
        long afterPromo = 0;
        for (NewLine l : lines) {
            PromotionService.Applied pr = promotionFor(l.item.group, true);
            long value = (long) l.unitTotal() * l.qty;
            afterPromo += value - (pr == null ? 0 : PricingPolicy.promotionDiscount(value, pr.percent()));
        }
        if (p.points() > PricingPolicy.maxRedeemablePoints((int) afterPromo))
            throw new OpsException(422, "POINTS_LIMIT", "Chỉ được dùng tối đa " + PricingPolicy.maxRedeemablePoints((int) afterPromo) + " điểm (30% giá trị đơn sau khuyến mãi).");
        return PricingPolicy.payableAfterPoints((int) afterPromo, p.points());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> quote(List<Map<String, Object>> in) {
        if (in == null || in.isEmpty()) throw new OpsException(422, "EMPTY", "Đơn chưa có món nào.");
        long total = 0, discount = 0;
        for (Map<String, Object> m : in) {
            NewLine l = buildLine(m, true);
            PromotionService.Applied p = promotionFor(l.item.group, true);
            long value = (long) l.unitTotal() * l.qty;
            total += value;
            if (p != null) discount += PricingPolicy.promotionDiscount(value, p.percent());
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("total", total);
        out.put("discount", discount);
        out.put("afterPromo", total - discount);
        out.put("maxPoints", PricingPolicy.maxRedeemablePoints((int) (total - discount)));
        return out;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Order> drafts() {
        return jdbc.queryForList("SELECT order_id FROM orders WHERE status = 'DRAFT' ORDER BY order_id", Integer.class).stream().map(this::loadOrder).toList();
    }

    /** Thu ngân tự kiểm tra đã nhận đủ tiền rồi xác nhận: kiểm tra lại món/nguyên liệu trước khi phát hành hóa đơn. */
    @Override
    public Order confirmDraft(int id, Account by) { return confirmDraft(id, by, Payer.NONE); }

    /** Khuyến mãi của đơn mang đi được chốt lại tại thời điểm xác nhận (BR-019). */
    private void applyPromotions(int orderId) {
        for (Map<String, Object> r : jdbc.queryForList("""
                SELECT l.line_id, m.item_group FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id
                JOIN menu_item m ON m.item_id = l.item_id WHERE b.order_id = ? AND l.status <> 'CANCELLED'""", orderId)) {
            PromotionService.Applied p = promotionFor((String) r.get("item_group"), true);
            jdbc.update("UPDATE order_line SET discount_percent = ?, promotion_id = ? WHERE line_id = ?", p == null ? 0 : p.percent(), p == null ? null : p.id(), r.get("line_id"));
        }
    }

    @Override
    public Order confirmDraft(int id, Account by, Payer payer) {
        OrderRow o = orderRow(id, true);
        if (!o.status.equals("DRAFT")) throw new OpsException(409, "NOT_DRAFT", "Đơn không còn ở trạng thái nháp.");
        Shift s = openSession();
        if (s == null) throw new OpsException(409, "NO_SHIFT", "Chưa mở ca thu ngân.");
        List<NewLine> lines = new ArrayList<>();
        for (Map<String, Object> l : jdbc.queryForList("""
                SELECT l.line_id, l.item_id, l.size, l.quantity, l.temperature, l.sugar_level, l.ice_level FROM order_line l
                JOIN order_batch b ON b.batch_id = l.batch_id WHERE b.order_id = ? AND l.status <> 'CANCELLED' ORDER BY l.line_id""", id)) {
            ItemRow m = one("SELECT item_id, name, item_group, status, allow_hot, allow_cold FROM menu_item WHERE item_id = ?", Rows::item, ((Number) l.get("item_id")).intValue());
            SizeRow sz = one(SIZE_SQL + " WHERE s.item_id = ? AND s.size = ?", Rows::size, l.get("item_id"), l.get("size"));
            if (m == null || sz == null || !"SELLING".equals(m.status) || !sz.sellable())
                throw new OpsException(409, "ITEM_UNAVAILABLE", (m == null ? "Món" : m.name) + " không còn bán, không thể xác nhận đơn.");
            lines.add(new NewLine(m, sz, ((Number) l.get("quantity")).intValue(), null, null, null, List.of()));
        }
        applyPromotions(id);
        // ASM-03: số tiền hiện tại phải bằng số tiền đã báo khách; lệch thì dừng, thu ngân báo lại khách (requote) hoặc hủy đơn nháp.
        Map<String, Object> q = jdbc.queryForMap("SELECT quoted_total, customer_id, points_to_use FROM takeaway_order WHERE order_id = ?", id);
        Payer eff = payer != null && (payer.customerId() != null || payer.points() > 0) ? payer
                : new Payer(q.get("customer_id") == null ? null : ((Number) q.get("customer_id")).intValue(), ((Number) q.get("points_to_use")).intValue());
        if (q.get("quoted_total") != null) {
            int quoted = ((Number) q.get("quoted_total")).intValue();
            int now = PricingPolicy.payableAfterPoints(amounts(id).afterPromo(), eff.points());
            if (now != quoted)
                throw new OpsException(409, "AMOUNT_CHANGED", "Số tiền đã thay đổi so với lúc báo khách: " + quoted + "đ → " + now + "đ. Hãy báo lại khách.",
                        Map.of("quoted", quoted, "current", now));
        }
        takeCakes(lines);
        jdbc.update("UPDATE takeaway_order SET queue_date = ?, queue_number = ? WHERE order_id = ?", today(), nextQueue(), id);
        jdbc.update("UPDATE orders SET status = 'PROCESSING' WHERE order_id = ?", id);
        jdbc.update("UPDATE order_batch SET sent_at = ? WHERE order_id = ?", nowUtc(), id);
        settle(id, s.id, "TRANSFER", null, by, eff);
        OrderRow row = orderRow(id, false);
        Order out = paidView(id, "TRANSFER", null, row);
        emit("ORDER_SENT", Map.of("orderId", id, "label", label(row.type, row.tableNo, row.queue), "lines", lines.size()));
        return out;
    }

    /** ASM-03: cập nhật số tiền đã báo khách về số hiện tại (sau khi khuyến mãi/giá đổi) để xác nhận được tiếp. */
    @Override
    public Order requoteDraft(int id, Account by) {
        OrderRow o = orderRow(id, true);
        if (!o.status.equals("DRAFT")) throw new OpsException(409, "NOT_DRAFT", "Đơn không còn ở trạng thái nháp.");
        applyPromotions(id);
        int points = jdbc.queryForObject("SELECT points_to_use FROM takeaway_order WHERE order_id = ?", Integer.class, id);
        int now = PricingPolicy.payableAfterPoints(amounts(id).afterPromo(), points);
        jdbc.update("UPDATE takeaway_order SET quoted_total = ? WHERE order_id = ?", now, id);
        return loadOrder(id);
    }

    @Override
    public Order cancelDraft(int id, Account by) {
        OrderRow o = orderRow(id, true);
        if (!o.status.equals("DRAFT")) throw new OpsException(409, "NOT_DRAFT", "Đơn không còn ở trạng thái nháp.");
        jdbc.update("""
                UPDATE order_line l JOIN order_batch b ON b.batch_id = l.batch_id
                SET l.status = 'CANCELLED', l.cancelled_by = ?, l.cancelled_at = ? WHERE b.order_id = ? AND l.status = 'NEW'""", employeeId(by), nowUtc(), id);
        jdbc.update("UPDATE orders SET status = 'CANCELLED' WHERE order_id = ?", id);
        return loadOrder(id);
    }
}
