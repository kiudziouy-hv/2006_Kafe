package vn.vtph.coffee.ops;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.ops.Model.*;
import vn.vtph.coffee.shared.pricing.PricingPolicy;

/**
 * Nghiệp vụ gọi món - pha chế - thanh toán, dữ liệu giả lập trong bộ nhớ (chế độ mặc định, không cần MySQL).
 * Bản MySQL tương ứng là {@link JdbcOpsService} (profile "mysql").
 */
@Service
@Profile("!mysql")
public class InMemoryOpsService implements OpsService {
    private final Map<Integer, MenuItem> menu = new LinkedHashMap<>();
    private final Map<Integer, Topping> toppings = new LinkedHashMap<>();
    private final Map<String, Ingredient> stock = new LinkedHashMap<>();
    private final Set<Integer> manualOut = new HashSet<>();
    private final Map<Integer, Order> orders = new LinkedHashMap<>();
    private final List<Shift> shifts = new ArrayList<>();
    private int orderSeq = 0, lineSeq = 0, takeawaySeq = 0, invoiceSeq = 0;

    private final ApplicationEventPublisher events;

    public InMemoryOpsService(ApplicationEventPublisher events) {
        this.events = events;
        ing("milk", "Sữa tươi", "ml", 100, 50); ing("coffee", "Cà phê hạt", "g", 2000, 300); ing("tea", "Trà", "g", 1000, 200);
        ing("fruit", "Trái cây", "g", 3000, 500); ing("cup", "Ly nhựa", "cái", 200, 30);
        ing("cake1", "Bánh mẫu 1", "cái", 8, 3); ing("cake2", "Bánh mẫu 2", "cái", 6, 3); ing("boba", "Trân châu", "g", 500, 100);
        item(1, "Món mẫu 1", "Coffee", false, false, false, new Size("M", "M", 35000), new Size("L", "L", 40000)).recipe.putAll(Map.of("coffee", 18, "milk", 30, "cup", 1));
        item(2, "Món mẫu 2", "Coffee", true, false, false, new Size("M", "M", 45000)).recipe.putAll(Map.of("coffee", 20, "cup", 1));
        item(3, "Món mẫu 3", "Tea", false, false, false, new Size("M", "M", 30000), new Size("L", "L", 35000)).recipe.putAll(Map.of("tea", 8, "cup", 1));
        item(4, "Món mẫu 4", "Sinh tố", false, true, false, new Size("M", "M", 39000)).recipe.putAll(Map.of("fruit", 150, "cup", 1));
        item(5, "Món mẫu 5", "Sinh tố", false, true, false, new Size("M", "M", 42000), new Size("L", "L", 48000)).recipe.putAll(Map.of("fruit", 180, "cup", 1));
        item(6, "Bánh mẫu 1", "Cake", false, false, true, new Size("1", "Phần", 30000)).recipe.put("cake1", 1);
        item(7, "Bánh mẫu 2", "Cake", false, false, true, new Size("1", "Phần", 32000)).recipe.put("cake2", 1);
        manualOut.add(4); // "Hết hàng" do Chủ quán đặt thủ công
        toppings.put(1, new Topping(1, "Topping mẫu 1", 5000, "boba", 30));
        toppings.put(2, new Topping(2, "Topping mẫu 2", 7000, "boba", 40));
        Topping t3 = new Topping(3, "Topping mẫu 3", 5000, "boba", 30); t3.status = "OUT_OF_STOCK"; toppings.put(3, t3);
    }

    private void ing(String id, String n, String u, int s, int m) { stock.put(id, new Ingredient(id, n, u, s, m)); }

    private MenuItem item(int id, String n, String g, boolean hot, boolean cold, boolean cake, Size... sz) {
        MenuItem m = new MenuItem(); m.id = id; m.name = n; m.group = g; m.hotOnly = hot; m.coldOnly = cold; m.cake = cake;
        m.sizes.addAll(Arrays.asList(sz)); menu.put(id, m); return m;
    }

    /** Phát sự kiện nghiệp vụ; lớp notification chuyển tiếp qua WebSocket. Dữ liệu đã đổi xong trước khi phát. */
    private void emit(String type, Map<String, Object> data) {
        events.publishEvent(new OpsEvent(type, data));
    }

    private String labelOf(Order o) {
        if (o.type.equals("DINE")) return "Bàn " + o.tableNo;
        return o.seq == null ? "Mang đi" : String.format("#%03d", o.seq);
    }

    // ---------- Thực đơn / bàn ----------
    private boolean enoughFor(MenuItem m, int qty) {
        return m.recipe.entrySet().stream().allMatch(e -> stock.get(e.getKey()).stock >= e.getValue() * qty);
    }

    @Override
    public synchronized Map<String, Object> menu() {
        List<Map<String, Object>> items = new ArrayList<>();
        for (MenuItem m : menu.values()) {
            Map<String, Object> o = new LinkedHashMap<>();
            String st = m.status;
            if (st.equals("ACTIVE") && (manualOut.contains(m.id) || !enoughFor(m, 1))) st = "OUT_OF_STOCK";
            o.put("id", m.id); o.put("name", m.name); o.put("group", m.group); o.put("status", st);
            o.put("hotOnly", m.hotOnly); o.put("coldOnly", m.coldOnly); o.put("cake", m.cake); o.put("takeaway", m.takeaway());
            o.put("sizes", m.sizes);
            items.add(o);
        }
        return Map.of("items", items, "toppings", toppings.values(), "groups", List.of("Coffee", "Tea", "Sinh tố", "Cake"));
    }

    private Order openOrderAt(int table) {
        return orders.values().stream().filter(o -> o.type.equals("DINE") && o.status.equals("OPEN") && o.tableNo == table).findFirst().orElse(null);
    }

    @Override
    public synchronized List<Map<String, Object>> tables() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (int n = 1; n <= 14; n++) {
            Order o = openOrderAt(n);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("no", n); m.put("zone", n <= 8 ? "Góc Hoài Niệm" : "Hiên Nắng");
            m.put("status", o == null ? "EMPTY" : o.waitingPay ? "WAITING_PAY" : "SERVING");
            m.put("orderId", o == null ? null : o.id);
            out.add(m);
        }
        return out;
    }

    // ---------- Tạo dòng món ----------
    private Line buildLine(Map<String, Object> in, boolean takeaway) {
        MenuItem m = menu.get(((Number) in.getOrDefault("itemId", -1)).intValue());
        if (m == null) throw new OpsException(422, "BAD_ITEM", "Món không tồn tại.");
        String st = menuStatus(m);
        if (!st.equals("ACTIVE")) throw new OpsException(422, "ITEM_UNAVAILABLE", m.name + (st.equals("OUT_OF_STOCK") ? " đã hết hàng." : " đã ngừng bán."));
        int qty = in.get("qty") instanceof Number n ? n.intValue() : 0;
        if (qty < 1 || qty > 20) throw new OpsException(422, "BAD_QTY", "Số lượng từ 1 đến 20.");
        Line l = new Line(); l.itemId = m.id; l.name = m.name; l.qty = qty; l.cake = m.cake;
        String size = String.valueOf(in.getOrDefault("size", m.sizes.get(0).code));
        Size sz = m.sizes.stream().filter(s -> s.code.equals(size)).findFirst().orElseThrow(() -> new OpsException(422, "BAD_SIZE", "Kích thước không hợp lệ."));
        l.size = sz.label; int price = sz.price;
        if (!m.cake) {
            String temp = String.valueOf(in.getOrDefault("temp", m.hotOnly ? "HOT" : "COLD"));
            if (!temp.equals("HOT") && !temp.equals("COLD")) throw new OpsException(422, "BAD_TEMP", "Chọn nóng hoặc lạnh.");
            if (m.hotOnly && temp.equals("COLD") || m.coldOnly && temp.equals("HOT")) throw new OpsException(422, "BAD_TEMP", m.name + " không có lựa chọn này.");
            if (takeaway && temp.equals("HOT")) throw new OpsException(422, "TAKEAWAY_RULE", "Đơn mang đi chỉ bán đồ uống lạnh và bánh.");
            String sugar = String.valueOf(in.getOrDefault("sugar", "50"));
            if (!List.of("0", "30", "50", "70", "100").contains(sugar)) throw new OpsException(422, "BAD_SUGAR", "Mức đường không hợp lệ.");
            String ice = temp.equals("HOT") ? "-" : String.valueOf(in.getOrDefault("ice", "NORMAL"));
            if (!temp.equals("HOT") && !List.of("NONE", "LESS", "NORMAL", "SEPARATE").contains(ice)) throw new OpsException(422, "BAD_ICE", "Mức đá không hợp lệ.");
            if (ice.equals("SEPARATE") && !takeaway) throw new OpsException(422, "BAD_ICE", "Đá riêng chỉ dùng cho đơn mang đi.");
            l.temp = temp; l.sugar = sugar; l.ice = ice;
            Object tp = in.get("toppings");
            if (tp instanceof List<?> ids) for (Object o : ids) {
                Topping t = toppings.get(((Number) o).intValue());
                if (t == null) throw new OpsException(422, "BAD_TOPPING", "Topping không tồn tại.");
                if (!t.status.equals("ACTIVE")) throw new OpsException(422, "TOPPING_UNAVAILABLE", t.name + " đã hết hàng.");
                l.toppings.add(t.name); l.toppingIds.add(t.id); price += t.price;
            }
        }
        l.unitPrice = price;
        return l;
    }

    private String menuStatus(MenuItem m) {
        if (!m.status.equals("ACTIVE")) return m.status;
        return manualOut.contains(m.id) || !enoughFor(m, 1) ? "OUT_OF_STOCK" : "ACTIVE";
    }

    private void checkCake(List<Line> lines) {
        Map<String, Integer> need = new HashMap<>();
        for (Line l : lines) if (l.cake) menu.get(l.itemId).recipe.forEach((k, v) -> need.merge(k, v * l.qty, Integer::sum));
        List<String> short_ = new ArrayList<>();
        need.forEach((k, v) -> { if (stock.get(k).stock < v) short_.add(stock.get(k).name); });
        if (!short_.isEmpty()) throw new OpsException(409, "NOT_ENOUGH_STOCK", "Không đủ số lượng: " + String.join(", ", short_) + ".");
    }

    private void takeCake(Line l) { if (l.cake) menu.get(l.itemId).recipe.forEach((k, v) -> stock.get(k).stock -= v * l.qty); }
    private void giveCake(Line l) { if (l.cake) menu.get(l.itemId).recipe.forEach((k, v) -> stock.get(k).stock += v * l.qty); }

    private void recalc(Order o) {
        o.total = o.lines.stream().filter(l -> !l.status.equals("CANCELLED")).mapToInt(Line::total).sum();
        o.rounded = PricingPolicy.roundToNearest500(o.total);
    }

    // ---------- Phục vụ ----------
    /** UC-08/09: tạo đơn mới cho bàn Trống hoặc gọi thêm vào đơn đang phục vụ. */
    @Override
    public synchronized Order send(int table, List<Map<String, Object>> in, Account by) {
        if (table < 1 || table > 14) throw new OpsException(404, "NO_TABLE", "Bàn không tồn tại.");
        if (in == null || in.isEmpty()) throw new OpsException(422, "EMPTY", "Đơn chưa có món nào.");
        Order o = openOrderAt(table);
        if (o != null && o.waitingPay) throw new OpsException(409, "WAITING_PAY", "Bàn đang chờ thanh toán, không thể gọi thêm.");
        List<Line> lines = new ArrayList<>();
        for (Map<String, Object> m : in) lines.add(buildLine(m, false));
        checkCake(lines);
        if (o == null) { o = new Order(); o.id = ++orderSeq; o.type = "DINE"; o.tableNo = table; o.createdBy = by.fullName; orders.put(o.id, o); }
        for (Line l : lines) { l.id = ++lineSeq; l.orderId = o.id; l.tableLabel = "Bàn " + table; takeCake(l); o.lines.add(l); }
        recalc(o);
        emit("ORDER_SENT", Map.of("orderId", o.id, "label", labelOf(o), "lines", lines.size()));
        return o;
    }

    @Override
    public synchronized Order orderAtTable(int table) {
        Order o = openOrderAt(table);
        if (o == null) throw new OpsException(404, "NO_ORDER", "Bàn này chưa có đơn.");
        return o;
    }

    private Order order(int id) {
        Order o = orders.get(id);
        if (o == null) throw new OpsException(404, "NO_ORDER", "Không tìm thấy đơn.");
        return o;
    }

    /** UC-15: hủy món. Dòng New: Phục vụ/Thu ngân/Chủ quán. Dòng Making: chỉ Chủ quán, bắt buộc lý do. */
    @Override
    public synchronized Order cancelLine(int orderId, int lineId, String reason, Account by) {
        String role = by.role.name();
        Order o = order(orderId);
        Line l = o.lines.stream().filter(x -> x.id == lineId).findFirst().orElseThrow(() -> new OpsException(404, "NO_LINE", "Không tìm thấy dòng món."));
        if (l.status.equals("CANCELLED") || l.status.equals("DONE")) throw new OpsException(409, "CANNOT_CANCEL", "Món này không thể hủy nữa.");
        if (o.status.equals("PAID") || o.status.equals("CANCELLED")) throw new OpsException(409, "CANNOT_CANCEL", "Đơn đã đóng, không thể hủy món.");
        if (l.status.equals("MAKING")) {
            if (!role.equals("OWNER")) throw new OpsException(403, "OWNER_ONLY", "Món đang pha, chỉ Chủ quán/Quản lý được hủy.");
            if (reason == null || reason.isBlank()) throw new OpsException(422, "REASON_REQUIRED", "Vui lòng nhập lý do.");
        } else giveCake(l);
        l.status = "CANCELLED"; l.cancelReason = reason;
        recalc(o);
        if (o.lines.stream().allMatch(x -> x.status.equals("CANCELLED")) && o.type.equals("DINE")) o.status = "CANCELLED";
        emit("LINE_CANCELLED", Map.of("orderId", o.id, "lineId", lineId, "label", labelOf(o), "name", l.name));
        return o;
    }

    /** UC-10: chuyển cả đơn sang bàn Trống. */
    @Override
    public synchronized Order move(int orderId, int to) {
        Order o = order(orderId);
        if (!o.type.equals("DINE") || !o.status.equals("OPEN")) throw new OpsException(409, "CANNOT_MOVE", "Không thể chuyển bàn cho đơn này.");
        if (to < 1 || to > 14) throw new OpsException(404, "NO_TABLE", "Bàn không tồn tại.");
        if (openOrderAt(to) != null) throw new OpsException(409, "TABLE_BUSY", "Bàn " + to + " không còn trống. Vui lòng chọn bàn khác.");
        o.tableNo = to; o.lines.forEach(l -> l.tableLabel = "Bàn " + to);
        return o;
    }

    /** UC-11: khách dùng xong, chuyển bàn sang Chờ thanh toán. */
    @Override
    public synchronized Order finish(int orderId) {
        Order o = order(orderId);
        if (!o.type.equals("DINE") || !o.status.equals("OPEN")) throw new OpsException(409, "CANNOT_FINISH", "Không thể thực hiện với đơn này.");
        boolean busy = o.lines.stream().anyMatch(l -> l.status.equals("NEW") || l.status.equals("MAKING"));
        if (busy) throw new OpsException(409, "LINES_PENDING", "Còn món chưa hoàn thành hoặc chưa hủy.");
        o.waitingPay = true;
        emit("TABLE_WAITING_PAY", Map.of("orderId", o.id, "label", labelOf(o)));
        return o;
    }

    // ---------- Pha chế ----------
    @Override
    public synchronized Map<String, Object> kitchen() {
        List<Line> all = new ArrayList<>();
        for (Order o : orders.values()) {
            if (o.status.equals("DRAFT") || o.status.equals("CANCELLED")) continue; // đơn nháp không hiện ở pha chế
            for (Line l : o.lines) if (!l.status.equals("CANCELLED")) all.add(l);
        }
        all.sort(Comparator.comparing((Line l) -> l.sentAt).thenComparingInt(l -> l.id));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Line l : all) {
            Order o = orders.get(l.orderId);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", l.id); m.put("orderId", o.id); m.put("label", o.type.equals("DINE") ? "Bàn " + o.tableNo : String.format("#%03d", o.seq));
            m.put("name", l.name); m.put("qty", l.qty); m.put("size", l.size); m.put("temp", l.temp); m.put("sugar", l.sugar); m.put("ice", l.ice);
            m.put("toppings", l.toppings); m.put("cake", l.cake); m.put("status", l.status); m.put("sentAt", l.sentAt.toString());
            m.put("canStart", l.status.equals("NEW") && canMake(l));
            out.add(m);
        }
        return Map.of("lines", out);
    }

    private Map<String, Integer> need(Line l) {
        Map<String, Integer> n = new LinkedHashMap<>();
        menu.get(l.itemId).recipe.forEach((k, v) -> n.merge(k, v * l.qty, Integer::sum));
        for (int id : l.toppingIds) { Topping t = toppings.get(id); n.merge(t.ingredient, t.amount * l.qty, Integer::sum); }
        return n;
    }

    private boolean canMake(Line l) { return l.cake || need(l).entrySet().stream().allMatch(e -> stock.get(e.getKey()).stock >= e.getValue()); }

    /** UC-14: New -> Making, trừ kho đồ uống. Thiếu nguyên liệu thì chặn và báo (không bỏ qua điều kiện). */
    @Override
    public synchronized Map<String, Object> start(int lineId) {
        Line l = findLine(lineId);
        if (!l.status.equals("NEW")) throw new OpsException(409, "BAD_STATE", "Món này không còn ở trạng thái Mới.");
        if (!l.cake) {
            List<String> lack = need(l).entrySet().stream().filter(e -> stock.get(e.getKey()).stock < e.getValue()).map(e -> stock.get(e.getKey()).name).collect(Collectors.toList());
            if (!lack.isEmpty()) throw new OpsException(409, "SHORTAGE", "Thiếu nguyên liệu: " + String.join(", ", lack) + ".", Map.of("ingredients", lack));
            need(l).forEach((k, v) -> stock.get(k).stock -= v);
        }
        l.status = "MAKING";
        emit("LINE_MAKING", Map.of("orderId", l.orderId, "lineId", l.id, "label", labelOf(orders.get(l.orderId)), "name", l.name));
        return Map.of("ok", true);
    }

    @Override
    public synchronized Map<String, Object> done(int lineId) {
        Line l = findLine(lineId);
        if (!l.status.equals("MAKING")) throw new OpsException(409, "BAD_STATE", "Chỉ hoàn thành được món đang pha.");
        l.status = "DONE";
        Order o = orders.get(l.orderId);
        emit("LINE_DONE", Map.of("orderId", o.id, "lineId", l.id, "label", labelOf(o), "name", l.name, "qty", l.qty, "takeaway", o.type.equals("TAKEAWAY")));
        return Map.of("ok", true, "label", o.type.equals("DINE") ? "Bàn " + o.tableNo : String.format("#%03d", o.seq), "name", l.name);
    }

    private Line findLine(int id) {
        for (Order o : orders.values()) for (Line l : o.lines) if (l.id == id) return l;
        throw new OpsException(404, "NO_LINE", "Không tìm thấy dòng món.");
    }

    // ---------- Ca thu ngân ----------
    private Shift openShift() { return shifts.stream().filter(s -> s.open).findFirst().orElse(null); }

    @Override
    public synchronized Map<String, Object> shiftState() {
        Shift s = openShift();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("open", s != null); m.put("shift", s);
        Shift last = shifts.stream().filter(x -> !x.open).reduce((a, b) -> b).orElse(null);
        fillTransfer(s); fillTransfer(last);
        m.put("lastClosed", last);
        List<Shift> week = new ArrayList<>(shifts);
        Collections.reverse(week);
        week.forEach(this::fillTransfer);
        m.put("days", ShiftDays.group(week, java.time.LocalDate.now().toString()));
        if (s != null) { m.put("cashSales", cashSales(s)); m.put("expected", s.openingCash + cashSales(s)); m.put("drafts", drafts().size()); m.put("undelivered", handovers().size()); }
        return m;
    }

    private void fillTransfer(Shift s) {
        if (s == null) return;
        var paid = orders.values().stream().filter(o -> o.status.equals("PAID") && "TRANSFER".equals(o.payMethod) && Objects.equals(o.shiftId, s.id)).toList();
        s.transferSales = paid.stream().mapToInt(o -> o.rounded).sum(); s.transferCount = paid.size();
        s.cashSales = cashSales(s);
        s.invoiceCount = (int) orders.values().stream().filter(o -> o.status.equals("PAID") && Objects.equals(o.shiftId, s.id)).count();
    }

    private int cashSales(Shift s) {
        return orders.values().stream().filter(o -> o.status.equals("PAID") && "CASH".equals(o.payMethod) && Objects.equals(o.shiftId, s.id)).mapToInt(o -> o.rounded).sum();
    }

    /** UC-30: mở ca. Chỉ một ca mở tại một thời điểm; ca tối chỉ mở khi ca sáng đã chốt. */
    @Override
    public synchronized Shift openShift(String type, Integer cash, Account by) {
        if (openShift() != null) throw new OpsException(409, "SHIFT_OPEN", "Đã có phiên ca đang mở, hãy chốt ca trước.");
        if (!List.of("MORNING", "EVENING").contains(type)) throw new OpsException(422, "BAD_TYPE", "Chọn ca sáng hoặc ca tối.");
        if (cash == null || cash < 0) throw new OpsException(422, "BAD_CASH", "Tiền mặt đầu ca không hợp lệ.");
        Shift s = new Shift(); s.id = shifts.size() + 1; s.type = type; s.openingCash = cash; s.openedBy = by.fullName; s.businessDate = java.time.LocalDate.now().toString(); shifts.add(s);
        emit("SHIFT_OPENED", Map.of("shiftId", s.id, "label", type.equals("MORNING") ? "Ca sáng" : "Ca tối"));
        return s;
    }

    /** UC-31: chốt ca. Chặn khi còn đơn nháp chuyển khoản/QR. */
    @Override
    public synchronized Shift closeShift(Integer actual, Account by) {
        Shift s = openShift();
        if (s == null) throw new OpsException(409, "NO_SHIFT", "Chưa mở ca thu ngân.");
        int d = drafts().size();
        if (d > 0) throw new OpsException(409, "DRAFTS_PENDING", "Còn " + d + " đơn nháp, hãy xác nhận hoặc hủy trước khi chốt ca.");
        int u = handovers().size();
        if (u > 0) throw new OpsException(409, "UNDELIVERED", "Còn " + u + " đơn mang đi chưa giao khách, hãy giao xong trước khi chốt ca.");
        if (actual == null || actual < 0) throw new OpsException(422, "BAD_CASH", "Vui lòng nhập tiền mặt kiểm đếm thực tế.");
        s.expectedCash = s.openingCash + cashSales(s); s.actualCash = actual; s.diff = actual - s.expectedCash;
        s.open = false; s.closedAt = Instant.now();
        emit("SHIFT_CLOSED", Map.of("shiftId", s.id, "label", s.type.equals("MORNING") ? "Ca sáng" : "Ca tối"));
        return s;
    }

    // ---------- Thanh toán ----------
    @Override
    public synchronized List<Order> pending() {
        return orders.values().stream().filter(o -> o.type.equals("DINE") && o.status.equals("OPEN")).sorted(Comparator.comparingInt((Order o) -> o.waitingPay ? 0 : 1).thenComparingInt(o -> o.id)).collect(Collectors.toList());
    }

    @Override
    public synchronized Order get(int id) { return order(id); }

    private String invoice() { return String.format("HD%04d", ++invoiceSeq); }

    /** UC-22: thanh toán đơn tại quán đang Chờ thanh toán. */
    @Override
    public synchronized Order pay(int orderId, String method, Integer received, Account by) {
        Order o = order(orderId);
        if (openShift() == null) throw new OpsException(409, "NO_SHIFT", "Chưa mở ca thu ngân.");
        if (!o.type.equals("DINE") || !o.status.equals("OPEN") || !o.waitingPay) throw new OpsException(409, "NOT_PAYABLE", "Đơn này chưa ở trạng thái Chờ thanh toán.");
        settle(o, method, received);
        return o;
    }

    private void settle(Order o, String method, Integer received) {
        recalc(o);
        if (o.rounded <= 0) throw new OpsException(422, "ZERO", "Đơn không có số tiền cần thanh toán.");
        if ("CASH".equals(method)) {
            if (received == null || received < o.rounded) throw new OpsException(422, "NOT_ENOUGH_CASH", "Tiền khách đưa chưa đủ " + o.rounded + "đ.");
            o.received = received; o.change = received - o.rounded;
        } else if ("TRANSFER".equals(method)) { o.received = o.rounded; o.change = 0; }
        else throw new OpsException(422, "BAD_METHOD", "Chọn tiền mặt hoặc chuyển khoản/QR.");
        o.payMethod = method; o.status = "PAID"; o.paidAt = Instant.now(); o.invoiceNo = invoice(); o.shiftId = openShift().id;
        o.waitingPay = false;
        emit("ORDER_PAID", Map.of("orderId", o.id, "label", labelOf(o), "invoiceNo", o.invoiceNo));
    }

    /** UC-12: đơn mang đi. Tiền mặt: thanh toán ngay. Chuyển khoản/QR: tạo đơn nháp chờ xác nhận. */
    @Override
    public synchronized Order takeaway(List<Map<String, Object>> in, String method, Integer received, Account by) {
        if (openShift() == null) throw new OpsException(409, "NO_SHIFT", "Chưa mở ca thu ngân.");
        if (in == null || in.isEmpty()) throw new OpsException(422, "EMPTY", "Đơn chưa có món nào.");
        List<Line> lines = new ArrayList<>();
        for (Map<String, Object> m : in) {
            MenuItem mi = menu.get(((Number) m.getOrDefault("itemId", -1)).intValue());
            if (mi != null && !mi.takeaway()) throw new OpsException(422, "TAKEAWAY_RULE", "Đơn mang đi chỉ bán đồ uống lạnh và bánh.");
            lines.add(buildLine(m, true));
        }
        Order o = new Order(); o.type = "TAKEAWAY"; o.createdBy = by.fullName; o.lines.addAll(lines);
        if ("TRANSFER".equals(method)) {
            o.id = ++orderSeq; o.status = "DRAFT"; orders.put(o.id, o);
            for (Line l : lines) { l.id = ++lineSeq; l.orderId = o.id; }
            recalc(o); return o;
        }
        checkCake(lines);
        recalc(o);
        settle(o, method, received); // ném lỗi trước khi lưu nếu thiếu tiền
        o.id = ++orderSeq; o.seq = ++takeawaySeq; orders.put(o.id, o);
        for (Line l : lines) { l.id = ++lineSeq; l.orderId = o.id; l.tableLabel = String.format("#%03d", o.seq); takeCake(l); }
        emit("ORDER_SENT", Map.of("orderId", o.id, "label", labelOf(o), "lines", lines.size()));
        return o;
    }

    @Override
    public synchronized List<Order> handovers() {
        return orders.values().stream().filter(o -> o.type.equals("TAKEAWAY") && o.status.equals("PAID") && o.handedOverAt == null)
                .sorted(Comparator.comparingInt((Order o) -> o.id)).collect(Collectors.toList());
    }

    @Override
    public synchronized Order handover(int orderId, Account by) {
        Order o = order(orderId);
        if (!o.type.equals("TAKEAWAY") || !o.status.equals("PAID")) throw new OpsException(409, "NOT_HANDOVER", "Chỉ giao được đơn mang đi đã thanh toán.");
        if (o.handedOverAt != null) throw new OpsException(409, "ALREADY_HANDED", "Đơn đã giao cho khách.");
        if (o.lines.stream().anyMatch(l -> l.status.equals("NEW") || l.status.equals("MAKING"))) throw new OpsException(409, "NOT_READY", "Pha chế chưa làm xong đơn này.");
        o.handedOverAt = Instant.now();
        return o;
    }

    @Override
    public synchronized List<Order> drafts() {
        return orders.values().stream().filter(o -> o.status.equals("DRAFT")).collect(Collectors.toList());
    }

    /** Thu ngân tự kiểm tra đã nhận đủ tiền rồi xác nhận: kiểm tra lại món/nguyên liệu trước khi phát hành hóa đơn. */
    @Override
    public synchronized Order confirmDraft(int id, Account by) {
        Order o = order(id);
        if (!o.status.equals("DRAFT")) throw new OpsException(409, "NOT_DRAFT", "Đơn không còn ở trạng thái nháp.");
        if (openShift() == null) throw new OpsException(409, "NO_SHIFT", "Chưa mở ca thu ngân.");
        for (Line l : o.lines) { String st = menuStatus(menu.get(l.itemId)); if (!st.equals("ACTIVE")) throw new OpsException(409, "ITEM_UNAVAILABLE", l.name + " không còn bán, không thể xác nhận đơn này."); }
        checkCake(o.lines);
        settle(o, "TRANSFER", null);
        o.seq = ++takeawaySeq;
        for (Line l : o.lines) { l.tableLabel = String.format("#%03d", o.seq); l.sentAt = Instant.now(); takeCake(l); }
        emit("ORDER_SENT", Map.of("orderId", o.id, "label", labelOf(o), "lines", o.lines.size()));
        return o;
    }

    @Override
    public synchronized Order cancelDraft(int id, Account by) {
        Order o = order(id);
        if (!o.status.equals("DRAFT")) throw new OpsException(409, "NOT_DRAFT", "Đơn không còn ở trạng thái nháp.");
        o.status = "CANCELLED"; o.lines.forEach(l -> l.status = "CANCELLED");
        return o;
    }
}
