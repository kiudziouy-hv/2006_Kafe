package vn.vtph.coffee.ops;

import vn.vtph.coffee.auth.AuthController;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import vn.vtph.coffee.support.AbstractMySqlIT;

/**
 * Gọi món - pha chế - thanh toán chạy trên MySQL thật qua API (ADR-006 bước 2). Dữ liệu mẫu của Chương 5:
 * bàn 1-14, 30 món (1 Cà phê đen, 6 Cappuccino chỉ nóng, 24 Tiramisu), PIN mẫu theo vai trò:
 * tài khoản 4 = Phục vụ, 2 = Thu ngân, 7 = Pha chế; chủ quán owner/admin123.
 */
class MySqlOpsIntegrationTest extends AbstractMySqlIT {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static Map<Integer, BigDecimal> stockSnapshot;
    private static List<Map<String, Object>> sizeSnapshot;

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ApplicationEvents events;

    MockHttpSession waiter, cashier, barista, owner;

    @BeforeEach
    void resetData() throws Exception {
        if (stockSnapshot == null) { // chụp trạng thái sau khi Flyway nạp dữ liệu mẫu
            stockSnapshot = new HashMap<>();
            jdbc.query("SELECT ingredient_id, current_stock FROM ingredient", rs -> { stockSnapshot.put(rs.getInt(1), rs.getBigDecimal(2)); });
            sizeSnapshot = jdbc.queryForList("SELECT item_id, size, status, status_source FROM item_size");
        }
        jdbc.execute((java.sql.Connection c) -> {
            try (var st = c.createStatement()) {
                st.execute("SET FOREIGN_KEY_CHECKS = 0");
                for (String t : List.of("point_transaction", "refund_record", "invoice_reprint", "invoice", "order_line_topping", "order_line", "waste_record",
                        "stock_adjustment", "order_batch", "takeaway_order", "dine_in_order", "orders", "cashier_session"))
                    st.execute("TRUNCATE TABLE " + t);
                st.execute("SET FOREIGN_KEY_CHECKS = 1");
            }
            return null;
        });
        jdbc.update("UPDATE dining_table SET status = 'EMPTY'");
        jdbc.update("UPDATE promotion SET active = 0"); // khuyến mãi mẫu phụ thuộc giờ chạy test, tắt để kết quả ổn định
        jdbc.update("UPDATE customer SET points = CASE customer_id WHEN 1 THEN 24 WHEN 2 THEN 0 ELSE 8 END");
        stockSnapshot.forEach((id, v) -> jdbc.update("UPDATE ingredient SET current_stock = ? WHERE ingredient_id = ?", v, id));
        for (Map<String, Object> s : sizeSnapshot)
            jdbc.update("UPDATE item_size SET status = ?, status_source = ? WHERE item_id = ? AND size = ?", s.get("status"), s.get("status_source"), s.get("item_id"), s.get("size"));
        waiter = login(4);
        cashier = login(2);
        barista = login(7);
        owner = new MockHttpSession();
        mvc.perform(post("/api/auth/owner/login").session(owner).contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"owner\",\"password\":\"admin123\"}")).andExpect(status().isOk());
    }

    // ---------- tiện ích gọi API ----------
    /** PIN mẫu theo vai trò: Phục vụ 123456, Lê Hoàng Cường34567, Pha chế 345678. */
    private static String pinOf(int accountId) { return accountId == 3 ? "456789" : accountId <= 3 ? "234567" : accountId >= 7 ? "345678" : "123456"; }

    private MockHttpSession login(int accountId) throws Exception {
        MockHttpSession s = new MockHttpSession();
        jdbc.update("UPDATE account SET failed_attempts = 0, locked_until = NULL, status = 'ACTIVE' WHERE account_id = ?", accountId);
        mvc.perform(post("/api/auth/staff/login").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"accountId\":" + accountId + ",\"pin\":\"" + pinOf(accountId) + "\"}")).andExpect(status().isOk());
        return s;
    }

    private JsonNode call(MockHttpSession s, boolean isPost, String url, String body, int expected) throws Exception {
        var req = isPost ? post(url).contentType(MediaType.APPLICATION_JSON).content(body == null ? "{}" : body) : get(url);
        String out = mvc.perform(req.session(s)).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        return out.isBlank() ? JSON.nullNode() : JSON.readTree(out);
    }

    private JsonNode getJson(MockHttpSession s, String url) throws Exception { return call(s, false, url, null, 200); }

    private JsonNode postJson(MockHttpSession s, String url, String body) throws Exception { return call(s, true, url, body, 200); }

    private JsonNode fail(MockHttpSession s, String url, String body, int status, String code) throws Exception {
        JsonNode e = call(s, true, url, body, status);
        assertEquals(code, e.get("code").asText(), e.toString());
        return e;
    }

    private static String line(int item, int qty, String size, String temp, String extra) {
        return "{\"itemId\":" + item + ",\"qty\":" + qty + ",\"size\":\"" + size + "\",\"temp\":\"" + temp + "\",\"sugar\":\"50\",\"ice\":\"NORMAL\"" + (extra == null ? "" : "," + extra) + "}";
    }

    private JsonNode send(int table, String... lines) throws Exception {
        return postJson(waiter, "/api/ops/tables/" + table + "/orders", "{\"lines\":[" + String.join(",", lines) + "]}");
    }

    private int stock(String name) { return jdbc.queryForObject("SELECT current_stock FROM ingredient WHERE name = ?", Integer.class, name); }

    private JsonNode openShift() throws Exception { return postJson(cashier, "/api/ops/shift/open", "{\"type\":\"MORNING\",\"openingCash\":500000}"); }

    private int firstKitchenLine(String status) throws Exception {
        for (JsonNode l : getJson(barista, "/api/ops/kitchen").get("lines")) if (l.get("status").asText().equals(status)) return l.get("id").asInt();
        throw new AssertionError("không có dòng " + status);
    }

    // ---------- thực đơn, bàn ----------
    @Test
    void tablesAndMenuComeFromTheDatabase() throws Exception {
        JsonNode tables = getJson(waiter, "/api/ops/tables");
        assertEquals(14, tables.size());
        assertEquals("Góc Hoài Niệm", tables.get(0).get("zone").asText());
        assertEquals("EMPTY", tables.get(0).get("status").asText());
        assertTrue(tables.get(0).get("orderId").isNull());
        assertEquals("Hiên Nắng", tables.get(8).get("zone").asText());

        JsonNode menu = getJson(waiter, "/api/ops/menu");
        assertEquals(30, menu.get("items").size());
        assertEquals(5, menu.get("toppings").size());
        assertEquals(List.of("Coffee", "Tea", "Sinh tố", "Cake"), List.of(menu.get("groups").get(0).asText(), menu.get("groups").get(1).asText(), menu.get("groups").get(2).asText(), menu.get("groups").get(3).asText()));
        JsonNode cappuccino = menu.get("items").get(5);
        assertEquals("Cappuccino", cappuccino.get("name").asText());
        assertTrue(cappuccino.get("hotOnly").asBoolean());
        assertFalse(cappuccino.get("takeaway").asBoolean());
        JsonNode tiramisu = menu.get("items").get(23);
        assertTrue(tiramisu.get("cake").asBoolean());
        assertEquals(45000, tiramisu.get("sizes").get(0).get("price").asInt());
        assertEquals("ACTIVE", tiramisu.get("status").asText());
    }

    // ---------- Phục vụ ----------
    @Test
    void sendingAnOrderPersistsOrderBatchLinesAndMarksTheTableServing() throws Exception {
        JsonNode o = send(5, "{\"itemId\":1,\"qty\":2,\"size\":\"M\",\"temp\":\"COLD\",\"sugar\":\"50\",\"ice\":\"LESS\",\"toppings\":[4]}");
        assertEquals("DINE", o.get("type").asText());
        assertEquals(5, o.get("tableNo").asInt());
        assertEquals("OPEN", o.get("status").asText());
        assertEquals("Bàn 5", o.get("lines").get(0).get("tableLabel").asText());
        assertEquals(41000, o.get("lines").get(0).get("unitPrice").asInt()); // 29.000 + Kem cheese 12.000
        assertEquals(82000, o.get("total").asInt());
        assertEquals("LESS", o.get("lines").get(0).get("ice").asText());
        assertEquals("Kem cheese", o.get("lines").get(0).get("toppings").get(0).asText());

        int id = o.get("id").asInt();
        assertEquals("PROCESSING", jdbc.queryForObject("SELECT status FROM orders WHERE order_id = ?", String.class, id));
        assertEquals(4, jdbc.queryForObject("SELECT created_by FROM orders WHERE order_id = ?", Integer.class, id)); // nhân viên 4 = phucvu1
        assertEquals(5, jdbc.queryForObject("SELECT t.number FROM dine_in_order d JOIN dining_table t ON t.table_id = d.open_table_id WHERE d.order_id = ?", Integer.class, id));
        assertEquals("SERVING", jdbc.queryForObject("SELECT status FROM dining_table WHERE number = 5", String.class));
        assertEquals("LOW", jdbc.queryForObject("SELECT ice_level FROM order_line", String.class));
        assertEquals(29000, jdbc.queryForObject("SELECT unit_price FROM order_line", Integer.class));
        assertEquals(12000, jdbc.queryForObject("SELECT surcharge FROM order_line_topping", Integer.class));

        JsonNode t5 = getJson(waiter, "/api/ops/tables").get(4);
        assertEquals("SERVING", t5.get("status").asText());
        assertEquals(id, t5.get("orderId").asInt());

        JsonNode again = send(5, line(3, 1, "M", "COLD", null)); // gọi thêm: cùng đơn, lô mới
        assertEquals(id, again.get("id").asInt());
        assertEquals(2, again.get("lines").size());
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM order_batch WHERE order_id = ?", Integer.class, id));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM orders", Integer.class));
        assertEquals(id, getJson(waiter, "/api/ops/tables/5/order").get("id").asInt());
        assertEquals(2, events.stream(OpsEvent.class).filter(e -> e.type().equals("ORDER_SENT")).count());
    }

    @Test
    void invalidLinesAreRejectedWithTheSameCodesAsTheInMemoryService() throws Exception {
        String body = "{\"lines\":[%s]}";
        fail(waiter, "/api/ops/tables/99/orders", body.formatted(line(1, 1, "M", "COLD", null)), 404, "NO_TABLE");
        fail(waiter, "/api/ops/tables/5/orders", "{\"lines\":[]}", 422, "EMPTY");
        fail(waiter, "/api/ops/tables/5/orders", body.formatted(line(1, 21, "M", "COLD", null)), 422, "BAD_QTY");
        fail(waiter, "/api/ops/tables/5/orders", body.formatted(line(1, 1, "XL", "COLD", null)), 422, "BAD_SIZE");
        fail(waiter, "/api/ops/tables/5/orders", body.formatted(line(1, 1, "M", "COLD", "\"toppings\":[1]")), 422, "BAD_TOPPING"); // topping 1 không dùng với món 1
        fail(waiter, "/api/ops/tables/5/orders", body.formatted(line(3, 1, "M", "HOT", null)), 422, "BAD_TEMP"); // Bạc xỉu chỉ lạnh
        fail(waiter, "/api/ops/tables/5/orders", body.formatted(line(999, 1, "M", "COLD", null)), 422, "BAD_ITEM");
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM orders", Integer.class));
        assertEquals(0, events.stream(OpsEvent.class).count());
        JsonNode hot = send(6, line(1, 1, "M", "HOT", null));
        assertEquals("-", hot.get("lines").get(0).get("ice").asText());
        assertNull(jdbc.queryForObject("SELECT ice_level FROM order_line", String.class));
    }

    @Test
    void cancellingNewLinesFollowsRolesAndReleasesTheTable() throws Exception {
        JsonNode o = send(5, line(1, 1, "M", "COLD", null), line(2, 1, "M", "COLD", null));
        int id = o.get("id").asInt(), l1 = o.get("lines").get(0).get("id").asInt(), l2 = o.get("lines").get(1).get("id").asInt();
        postJson(waiter, "/api/ops/orders/" + id + "/lines/" + l1 + "/cancel", "{}");
        assertEquals("CANCELLED", jdbc.queryForObject("SELECT status FROM order_line WHERE line_id = ?", String.class, l1));
        assertEquals(4, jdbc.queryForObject("SELECT cancelled_by FROM order_line WHERE line_id = ?", Integer.class, l1));

        postJson(barista, "/api/ops/kitchen/" + l2 + "/start", null);
        fail(waiter, "/api/ops/orders/" + id + "/lines/" + l2 + "/cancel", "{\"reason\":\"khách đổi ý\"}", 403, "OWNER_ONLY");
        fail(owner, "/api/ops/orders/" + id + "/lines/" + l2 + "/cancel", "{}", 422, "REASON_REQUIRED");
        JsonNode done = postJson(owner, "/api/ops/orders/" + id + "/lines/" + l2 + "/cancel", "{\"reason\":\"khách đổi ý\"}");
        assertEquals("CANCELLED", done.get("status").asText());
        assertEquals("khách đổi ý", jdbc.queryForObject("SELECT cancel_reason FROM order_line WHERE line_id = ?", String.class, l2));
        assertEquals("EMPTY", jdbc.queryForObject("SELECT status FROM dining_table WHERE number = 5", String.class));
        assertNull(jdbc.queryForObject("SELECT open_table_id FROM dine_in_order WHERE order_id = ?", Integer.class, id));
        fail(waiter, "/api/ops/orders/" + id + "/lines/" + l1 + "/cancel", "{}", 409, "CANNOT_CANCEL");
        send(5, line(1, 1, "M", "COLD", null)); // bàn đã trống nên gọi lại được
    }

    @Test
    void cakesAreDeductedWhenConfirmedAndGivenBackWhenCancelled() throws Exception {
        int before = stock("Bánh tiramisu");
        JsonNode o = send(7, "{\"itemId\":24,\"qty\":2,\"size\":\"M\"}");
        assertEquals(before - 2, stock("Bánh tiramisu"));
        assertTrue(o.get("lines").get(0).get("cake").asBoolean());
        assertTrue(o.get("lines").get(0).get("temp").isNull());
        postJson(waiter, "/api/ops/orders/" + o.get("id").asInt() + "/lines/" + o.get("lines").get(0).get("id").asInt() + "/cancel", "{}");
        assertEquals(before, stock("Bánh tiramisu"));
        jdbc.update("UPDATE ingredient SET current_stock = 1 WHERE name = 'Bánh tiramisu'");
        fail(waiter, "/api/ops/tables/8/orders", "{\"lines\":[{\"itemId\":24,\"qty\":2,\"size\":\"M\"}]}", 409, "NOT_ENOUGH_STOCK");
        assertEquals(1, stock("Bánh tiramisu")); // thiếu thì không trừ gì
        jdbc.update("UPDATE ingredient SET current_stock = 0 WHERE name = 'Bánh tiramisu'");
        fail(waiter, "/api/ops/tables/8/orders", "{\"lines\":[{\"itemId\":24,\"qty\":1,\"size\":\"M\"}]}", 422, "ITEM_UNAVAILABLE");
    }

    @Test
    void movingAnOrderNeedsAFreeTable() throws Exception {
        int id = send(5, line(1, 1, "M", "COLD", null)).get("id").asInt();
        send(6, line(2, 1, "M", "COLD", null));
        fail(waiter, "/api/ops/orders/" + id + "/move", "{\"to\":6}", 409, "TABLE_BUSY");
        fail(waiter, "/api/ops/orders/" + id + "/move", "{\"to\":99}", 404, "NO_TABLE");
        JsonNode moved = postJson(waiter, "/api/ops/orders/" + id + "/move", "{\"to\":7}");
        assertEquals(7, moved.get("tableNo").asInt());
        assertEquals("Bàn 7", moved.get("lines").get(0).get("tableLabel").asText());
        JsonNode tables = getJson(waiter, "/api/ops/tables");
        assertEquals("EMPTY", tables.get(4).get("status").asText());
        assertEquals("SERVING", tables.get(6).get("status").asText());
        assertEquals(id, getJson(waiter, "/api/ops/tables/7/order").get("id").asInt());
    }

    // ---------- Pha chế ----------
    @Test
    void kitchenStartsAndFinishesLinesAndDeductsStock() throws Exception {
        send(5, line(1, 1, "M", "COLD", null));
        JsonNode board = getJson(barista, "/api/ops/kitchen");
        assertEquals(1, board.get("lines").size());
        JsonNode l = board.get("lines").get(0);
        assertEquals("Bàn 5", l.get("label").asText());
        assertEquals("NEW", l.get("status").asText());
        assertTrue(l.get("canStart").asBoolean());
        int cups = stock("Ly nhựa M");
        fail(waiter, "/api/ops/kitchen/" + l.get("id").asInt() + "/start", null, 403, "FORBIDDEN");
        postJson(barista, "/api/ops/kitchen/" + l.get("id").asInt() + "/start", null);
        assertEquals(cups - 1, stock("Ly nhựa M"));
        assertEquals("MAKING", getJson(barista, "/api/ops/kitchen").get("lines").get(0).get("status").asText());
        fail(barista, "/api/ops/kitchen/" + l.get("id").asInt() + "/start", null, 409, "BAD_STATE");
        JsonNode done = postJson(barista, "/api/ops/kitchen/" + l.get("id").asInt() + "/done", null);
        assertEquals("Bàn 5", done.get("label").asText());
        assertEquals("DONE", jdbc.queryForObject("SELECT status FROM order_line", String.class));
        fail(barista, "/api/ops/kitchen/" + l.get("id").asInt() + "/done", null, 409, "BAD_STATE");
        List<String> types = events.stream(OpsEvent.class).map(OpsEvent::type).toList();
        assertEquals(List.of("ORDER_SENT", "LINE_MAKING", "LINE_DONE"), types);
    }

    @Test
    void shortageKeepsTheLineNewAndMarksTheSizeOutOfStockPermanently() throws Exception {
        send(5, line(1, 1, "M", "COLD", null));
        jdbc.update("UPDATE ingredient SET current_stock = 0");
        int lid = firstKitchenLine("NEW");
        assertFalse(getJson(barista, "/api/ops/kitchen").get("lines").get(0).get("canStart").asBoolean());
        JsonNode e = fail(barista, "/api/ops/kitchen/" + lid + "/start", null, 409, "SHORTAGE");
        assertTrue(e.get("ingredients").size() > 0);
        assertEquals("NEW", jdbc.queryForObject("SELECT status FROM order_line WHERE line_id = ?", String.class, lid));
        Map<String, Object> size = jdbc.queryForMap("SELECT status, status_source FROM item_size WHERE item_id = 1 AND size = 'M'");
        assertEquals("OUT_OF_STOCK", size.get("status"));
        assertEquals("SYSTEM", size.get("status_source"));
        fail(waiter, "/api/ops/tables/6/orders", "{\"lines\":[" + line(1, 1, "M", "COLD", null) + "]}", 422, "ITEM_UNAVAILABLE");
    }

    @Test
    void shortageOfAToppingMarksOnlyTheToppingOutOfStock() throws Exception {
        send(5, line(1, 1, "M", "COLD", "\"toppings\":[3]"));
        jdbc.update("""
                UPDATE ingredient SET current_stock = 0 WHERE ingredient_id IN
                  (SELECT rl.ingredient_id FROM recipe r JOIN recipe_line rl ON rl.recipe_id = r.recipe_id WHERE r.topping_id = 3)""");
        int lid = firstKitchenLine("NEW");
        fail(barista, "/api/ops/kitchen/" + lid + "/start", null, 409, "SHORTAGE");
        Map<String, Object> top = jdbc.queryForMap("SELECT status, status_source FROM topping WHERE topping_id = 3");
        assertEquals("OUT_OF_STOCK", top.get("status"));
        assertEquals("SYSTEM", top.get("status_source"));
        assertEquals("SELLING", jdbc.queryForObject("SELECT status FROM item_size WHERE item_id = 1 AND size = 'M'", String.class));
    }

    @Test
    void addingItemsToATableWaitingForPaymentReturnsItToServing() throws Exception {
        int id = send(5, line(1, 1, "M", "COLD", null)).get("id").asInt();
        int lid = firstKitchenLine("NEW");
        postJson(barista, "/api/ops/kitchen/" + lid + "/start", null);
        postJson(barista, "/api/ops/kitchen/" + lid + "/done", null);
        assertTrue(postJson(waiter, "/api/ops/orders/" + id + "/finish", null).get("waitingPay").asBoolean());
        JsonNode again = send(5, line(2, 1, "M", "COLD", null));
        assertFalse(again.get("waitingPay").asBoolean());
        assertEquals("SERVING", jdbc.queryForObject("SELECT status FROM dining_table WHERE number = 5", String.class));
        assertEquals("PROCESSING", jdbc.queryForObject("SELECT status FROM orders WHERE order_id = ?", String.class, id));
    }

    // ---------- Thanh toán ----------
    @Test
    void finishThenPayCreatesTheInvoiceAndFreesTheTable() throws Exception {
        int id = send(5, line(1, 1, "M", "COLD", "\"toppings\":[3]")).get("id").asInt(); // 29.000 + Pudding 8.000 = 37.000
        fail(waiter, "/api/ops/orders/" + id + "/finish", null, 409, "LINES_PENDING");
        int lid = firstKitchenLine("NEW");
        postJson(barista, "/api/ops/kitchen/" + lid + "/start", null);
        postJson(barista, "/api/ops/kitchen/" + lid + "/done", null);
        JsonNode waiting = postJson(waiter, "/api/ops/orders/" + id + "/finish", null);
        assertTrue(waiting.get("waitingPay").asBoolean());
        assertEquals("WAITING_PAYMENT", jdbc.queryForObject("SELECT status FROM dining_table WHERE number = 5", String.class));
        assertEquals("DONE", jdbc.queryForObject("SELECT status FROM orders WHERE order_id = ?", String.class, id));
        assertEquals("WAITING_PAY", getJson(waiter, "/api/ops/tables").get(4).get("status").asText());
        assertEquals(id, getJson(cashier, "/api/ops/pending").get(0).get("id").asInt());

        fail(cashier, "/api/ops/orders/" + id + "/pay", "{\"method\":\"CASH\",\"received\":100000}", 409, "NO_SHIFT");
        assertTrue(openShift().get("open").asBoolean());
        fail(cashier, "/api/ops/orders/" + id + "/pay", "{\"method\":\"CASH\",\"received\":30000}", 422, "NOT_ENOUGH_CASH");
        fail(cashier, "/api/ops/orders/" + id + "/pay", "{\"method\":\"CHEQUE\"}", 422, "BAD_METHOD");
        fail(waiter, "/api/ops/orders/" + id + "/pay", "{\"method\":\"CASH\",\"received\":100000}", 403, "FORBIDDEN");
        JsonNode paid = postJson(cashier, "/api/ops/orders/" + id + "/pay", "{\"method\":\"CASH\",\"received\":100000}");
        assertEquals("PAID", paid.get("status").asText());
        assertEquals("HD0001", paid.get("invoiceNo").asText());
        assertEquals(63000, paid.get("change").asInt());
        assertEquals("CASH", paid.get("payMethod").asText());

        Map<String, Object> inv = jdbc.queryForMap("SELECT * FROM invoice");
        assertEquals(37000L, ((Number) inv.get("total")).longValue());
        assertEquals(37000L, ((Number) inv.get("subtotal")).longValue());
        assertEquals(2, ((Number) inv.get("issued_by")).intValue());
        assertEquals("PAID", inv.get("status"));
        assertEquals("EMPTY", jdbc.queryForObject("SELECT status FROM dining_table WHERE number = 5", String.class));
        fail(cashier, "/api/ops/orders/" + id + "/pay", "{\"method\":\"CASH\",\"received\":100000}", 409, "NOT_PAYABLE");
        assertEquals("PAID", getJson(cashier, "/api/ops/orders/" + id).get("status").asText());
        JsonNode shift = getJson(cashier, "/api/ops/shift");
        assertEquals(37000, shift.get("cashSales").asInt());
        assertEquals(537000, shift.get("expected").asInt());
        assertTrue(events.stream(OpsEvent.class).anyMatch(e -> e.type().equals("ORDER_PAID")));
    }

    @Test
    void takeawayCashTransferDraftsAndClosingTheShift() throws Exception {
        String cold = "{\"lines\":[" + line(2, 1, "M", "COLD", null) + "],\"method\":\"CASH\",\"received\":50000}";
        fail(cashier, "/api/ops/takeaway", cold, 409, "NO_SHIFT");
        openShift();
        fail(cashier, "/api/ops/takeaway", "{\"lines\":[" + line(6, 1, "M", "HOT", null) + "],\"method\":\"CASH\",\"received\":50000}", 422, "TAKEAWAY_RULE");
        fail(cashier, "/api/ops/takeaway", "{\"lines\":[" + line(2, 1, "M", "COLD", null) + "],\"method\":\"CASH\",\"received\":1000}", 422, "NOT_ENOUGH_CASH");
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM orders", Integer.class)); // lỗi thì không để lại đơn nào

        JsonNode a = postJson(cashier, "/api/ops/takeaway", cold); // Cà phê sữa M 32.000
        JsonNode b = postJson(cashier, "/api/ops/takeaway", cold);
        assertEquals(1, a.get("seq").asInt());
        assertEquals(2, b.get("seq").asInt());
        assertEquals("PAID", a.get("status").asText());
        assertEquals(18000, a.get("change").asInt());
        assertEquals("#001", getJson(barista, "/api/ops/kitchen").get("lines").get(0).get("label").asText());
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM invoice WHERE payment_method = 'CASH'", Integer.class));

        JsonNode d1 = postJson(cashier, "/api/ops/takeaway", "{\"lines\":[" + line(2, 1, "M", "COLD", null) + "],\"method\":\"TRANSFER\"}");
        JsonNode d2 = postJson(cashier, "/api/ops/takeaway", "{\"lines\":[" + line(3, 1, "M", "COLD", null) + "],\"method\":\"TRANSFER\"}");
        assertEquals("DRAFT", d1.get("status").asText());
        assertTrue(d1.get("seq").isNull());
        assertEquals(2, getJson(cashier, "/api/ops/drafts").size());
        assertEquals(2, getJson(barista, "/api/ops/kitchen").get("lines").size()); // đơn nháp không hiện ở pha chế
        fail(cashier, "/api/ops/shift/close", "{\"actualCash\":564000}", 409, "DRAFTS_PENDING");

        JsonNode confirmed = postJson(cashier, "/api/ops/drafts/" + d1.get("id").asInt() + "/confirm", null);
        assertEquals("PAID", confirmed.get("status").asText());
        assertEquals(3, confirmed.get("seq").asInt());
        assertEquals("TRANSFER", confirmed.get("payMethod").asText());
        assertEquals("TRANSFER_QR", jdbc.queryForObject("SELECT payment_method FROM invoice WHERE order_id = ?", String.class, d1.get("id").asInt()));
        assertEquals(3, getJson(barista, "/api/ops/kitchen").get("lines").size());
        JsonNode cancelled = postJson(cashier, "/api/ops/drafts/" + d2.get("id").asInt() + "/cancel", null);
        assertEquals("CANCELLED", cancelled.get("status").asText());
        assertEquals("CANCELLED", cancelled.get("lines").get(0).get("status").asText());
        fail(cashier, "/api/ops/drafts/" + d2.get("id").asInt() + "/confirm", null, 409, "NOT_DRAFT");

        fail(cashier, "/api/ops/shift/close", "{\"actualCash\":564000}", 409, "UNDELIVERED"); // 3 đơn mang đi chưa giao khách
        for (int i = 0; i < 3; i++) {
            int lid = firstKitchenLine("NEW");
            postJson(barista, "/api/ops/kitchen/" + lid + "/start", null);
            postJson(barista, "/api/ops/kitchen/" + lid + "/done", null);
        }
        for (JsonNode h : getJson(cashier, "/api/ops/takeaway/handovers")) postJson(cashier, "/api/ops/orders/" + h.get("id").asInt() + "/handover", null);

        fail(cashier, "/api/ops/shift/close", "{}", 422, "BAD_CASH");
        JsonNode closed = postJson(cashier, "/api/ops/shift/close", "{\"actualCash\":563000}"); // đầu ca 500.000 + 2 × 32.000 tiền mặt = 564.000
        // mở và chốt ca đều phát sự kiện để mọi cửa sổ thu ngân làm mới trạng thái ca
        assertEquals(1, events.stream(OpsEvent.class).filter(e -> e.type().equals("SHIFT_OPENED")).count());
        assertEquals(1, events.stream(OpsEvent.class).filter(e -> e.type().equals("SHIFT_CLOSED") && "Ca sáng".equals(e.data().get("label"))).count());
        assertEquals(564000, closed.get("expectedCash").asInt());
        assertEquals(-1000, closed.get("diff").asInt());
        assertFalse(closed.get("open").asBoolean());
        JsonNode state = getJson(cashier, "/api/ops/shift");
        assertFalse(state.get("open").asBoolean());
        assertEquals(closed.get("id").asInt(), state.get("lastClosed").get("id").asInt());
        JsonNode today = state.get("days").get(0); // hôm nay đứng đầu, có ca sáng vừa chốt cùng tổng ngày
        assertEquals(closed.get("id").asInt(), today.get("shifts").get(0).get("id").asInt());
        assertEquals(564000 - 500000, today.get("cashTotal").asInt());
        assertEquals(32000, today.get("transferTotal").asInt());
        assertEquals(3, today.get("invoiceCount").asInt());
        fail(cashier, "/api/ops/shift/open", "{\"type\":\"MORNING\",\"openingCash\":0}", 409, "SHIFT_EXISTS"); // mỗi ca một lần/ngày
        assertTrue(openShiftEvening().get("open").asBoolean());
    }

    /** Đơn nháp (chờ xác nhận chuyển khoản) và đơn đã hủy không được đưa sang pha chế, kể cả khi gọi thẳng API. */
    @Test
    void draftOrAndCancelledOrderLinesCannotBeStartedByKitchenApi() throws Exception {
        openShift();
        JsonNode d = postJson(cashier, "/api/ops/takeaway", "{\"lines\":[" + line(2, 1, "M", "COLD", null) + "],\"method\":\"TRANSFER\"}");
        int lineId = jdbc.queryForObject("SELECT l.line_id FROM order_line l JOIN order_batch b ON b.batch_id = l.batch_id WHERE b.order_id = ?",
                Integer.class, d.get("id").asInt());
        BigDecimal before = jdbc.queryForObject("SELECT SUM(current_stock) FROM ingredient", BigDecimal.class);
        fail(barista, "/api/ops/kitchen/" + lineId + "/start", null, 409, "ORDER_NOT_ACTIVE");
        assertEquals("NEW", jdbc.queryForObject("SELECT status FROM order_line WHERE line_id = ?", String.class, lineId));
        assertEquals(0, before.compareTo(jdbc.queryForObject("SELECT SUM(current_stock) FROM ingredient", BigDecimal.class)));
        postJson(cashier, "/api/ops/drafts/" + d.get("id").asInt() + "/cancel", null);
        fail(barista, "/api/ops/kitchen/" + lineId + "/start", null, 409, "BAD_STATE"); // dòng đã bị hủy theo đơn
    }

    /** ASM-03: đơn nháp chuyển khoản nhớ số tiền đã báo khách; lệch lúc xác nhận thì chặn, báo lại (requote) rồi mới xác nhận được. */
    @Test
    void draftConfirmationIsBlockedWhenTheQuotedAmountChanged() throws Exception {
        openShift();
        JsonNode d = postJson(cashier, "/api/ops/takeaway", "{\"lines\":[" + line(2, 1, "M", "COLD", null) + "],\"method\":\"TRANSFER\"}"); // 32.000đ
        int id = d.get("id").asInt();
        assertEquals(32000, jdbc.queryForObject("SELECT quoted_total FROM takeaway_order WHERE order_id = ?", Integer.class, id));
        jdbc.update("INSERT INTO promotion (name, item_group, discount_percent, daily_start, daily_end, active, created_at) "
                + "SELECT 'Test ASM-03', item_group, 50, '00:00:00', '23:59:59', 1, UTC_TIMESTAMP() FROM menu_item WHERE item_id = 2");
        try {
            JsonNode e = fail(cashier, "/api/ops/drafts/" + id + "/confirm", null, 409, "AMOUNT_CHANGED");
            assertEquals(32000, e.get("quoted").asInt());
            assertEquals(16000, e.get("current").asInt());
            assertEquals("DRAFT", jdbc.queryForObject("SELECT status FROM orders WHERE order_id = ?", String.class, id)); // chưa phát hành hóa đơn
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM invoice", Integer.class));
            postJson(cashier, "/api/ops/drafts/" + id + "/requote", null);
            assertEquals(16000, jdbc.queryForObject("SELECT quoted_total FROM takeaway_order WHERE order_id = ?", Integer.class, id));
            assertEquals("PAID", postJson(cashier, "/api/ops/drafts/" + id + "/confirm", null).get("status").asText());
            assertEquals(16000, jdbc.queryForObject("SELECT total FROM invoice WHERE order_id = ?", Integer.class, id));
        } finally {
            // dòng món đã chốt khuyến mãi giữ khóa ngoại tới chương trình: gỡ trước khi xóa
            jdbc.update("UPDATE order_line SET promotion_id = NULL WHERE promotion_id IN (SELECT promotion_id FROM promotion WHERE name = 'Test ASM-03')");
            jdbc.update("DELETE FROM promotion WHERE name = 'Test ASM-03'");
        }
    }

    private JsonNode openShiftEvening() throws Exception { return postJson(cashier, "/api/ops/shift/open", "{\"type\":\"EVENING\",\"openingCash\":0}"); }

    /** ASM-35: ca sáng bàn giao đơn đang mở sang ca tối. ASM-46, BR-037: ca tối chỉ chốt khi không còn đơn mở và mọi bàn Trống. */
    @Test
    void morningShiftHandsOverOpenOrdersButEveningShiftCannotCloseWithThem() throws Exception {
        openShift();
        int id = send(5, line(1, 1, "M", "COLD", null)).get("id").asInt(); // 29.000, bàn 5 đang phục vụ
        postJson(cashier, "/api/ops/shift/close", "{\"actualCash\":500000}"); // ca sáng không bị chặn bởi đơn đang mở
        openShiftEvening();

        JsonNode blocked = fail(cashier, "/api/ops/shift/close", "{\"actualCash\":0}", 409, "OPEN_ORDERS");
        assertEquals(1, blocked.get("orders").size());
        assertEquals(1, blocked.get("tables").size());
        assertEquals(5, blocked.get("tables").get(0).get("number").asInt());

        int lid = firstKitchenLine("NEW");
        postJson(barista, "/api/ops/kitchen/" + lid + "/start", null);
        postJson(barista, "/api/ops/kitchen/" + lid + "/done", null);
        postJson(waiter, "/api/ops/orders/" + id + "/finish", null);
        fail(cashier, "/api/ops/shift/close", "{\"actualCash\":0}", 409, "OPEN_ORDERS"); // chưa thanh toán, bàn Chờ thanh toán
        postJson(cashier, "/api/ops/orders/" + id + "/pay", "{\"method\":\"CASH\",\"received\":29000}");
        assertFalse(postJson(cashier, "/api/ops/shift/close", "{\"actualCash\":29000}").get("open").asBoolean());
    }

    // ---------- hợp đồng API và lớp bảo vệ CSDL ----------
    @Test
    void orderJsonHasTheSameFieldsAsTheInMemoryModel() throws Exception {
        JsonNode o = send(5, line(1, 1, "M", "COLD", "\"toppings\":[3]"));
        for (var f : Model.Order.class.getFields()) assertTrue(o.has(f.getName()), "thiếu trường đơn: " + f.getName());
        for (var f : Model.Line.class.getFields()) assertTrue(o.get("lines").get(0).has(f.getName()), "thiếu trường dòng: " + f.getName());
        JsonNode shift = openShift();
        for (var f : Model.Shift.class.getFields()) assertTrue(shift.has(f.getName()), "thiếu trường ca: " + f.getName());
        JsonNode menu = getJson(waiter, "/api/ops/menu");
        for (String k : List.of("id", "name", "group", "status", "hotOnly", "coldOnly", "cake", "takeaway", "sizes")) assertTrue(menu.get("items").get(0).has(k), k);
    }

    @Test
    void databaseTriggersStillGuardAgainstBypassingTheService() throws Exception {
        send(5, line(1, 1, "M", "COLD", null));
        int lid = firstKitchenLine("NEW");
        DataAccessException skip = assertThrows(DataAccessException.class, () -> jdbc.update("UPDATE order_line SET status = 'DONE' WHERE line_id = ?", lid));
        assertTrue(skip.getMessage().contains("BR-004"), skip.getMessage());
        assertThrows(DataAccessException.class, () -> jdbc.update("DELETE FROM order_line WHERE line_id = ?", lid));
        int table = jdbc.queryForObject("SELECT table_id FROM dining_table WHERE number = 5", Integer.class);
        int staff = 4;
        int extra = jdbc.queryForObject("SELECT COUNT(*) FROM dine_in_order WHERE open_table_id = ?", Integer.class, table);
        assertEquals(1, extra);
        // ASM-01: thêm đơn mở thứ hai cho cùng bàn bị ràng buộc duy nhất chặn
        int order2 = jdbc.queryForObject("SELECT MAX(order_id) + 1 FROM orders", Integer.class);
        jdbc.update("INSERT INTO orders (order_id, order_type, status, created_by) VALUES (?, 'DINE_IN', 'PROCESSING', ?)", order2, staff);
        assertThrows(DataAccessException.class, () -> jdbc.update("INSERT INTO dine_in_order (order_id, table_id) VALUES (?, ?)", order2, table));
    }

    /** Đơn mang đi: Thu ngân giao khách sau khi pha chế xong; chuyển khoản được cộng riêng trong ca; hóa đơn ghi nhân viên đang chấm công. */
    @Test
    void takeawayHandoverTransferTotalsAndStaffOnDuty() throws Exception {
        openShift();
        String cash = "{\"lines\":[" + line(2, 1, "M", "COLD", null) + "],\"method\":\"CASH\",\"received\":50000";

        // giao khách: chỉ giao được khi pha chế xong, và chỉ một lần
        int id = postJson(cashier, "/api/ops/takeaway", cash + "}").get("id").asInt();
        assertEquals(id, getJson(cashier, "/api/ops/takeaway/handovers").get(0).get("id").asInt());
        fail(cashier, "/api/ops/orders/" + id + "/handover", null, 409, "NOT_READY");
        fail(waiter, "/api/ops/orders/" + id + "/handover", null, 403, "FORBIDDEN");
        int lineId = firstKitchenLine("NEW");
        postJson(barista, "/api/ops/kitchen/" + lineId + "/start", null);
        postJson(barista, "/api/ops/kitchen/" + lineId + "/done", null);
        postJson(cashier, "/api/ops/orders/" + id + "/handover", null);
        fail(cashier, "/api/ops/orders/" + id + "/handover", null, 409, "ALREADY_HANDED");
        assertEquals(0, getJson(cashier, "/api/ops/takeaway/handovers").size());

        // doanh thu chuyển khoản của ca chỉ để xem, không vào tiền mặt dự kiến
        JsonNode draft = postJson(cashier, "/api/ops/takeaway", "{\"lines\":[" + line(2, 1, "M", "COLD", null) + "],\"method\":\"TRANSFER\"}");
        postJson(cashier, "/api/ops/drafts/" + draft.get("id").asInt() + "/confirm", "{}");
        JsonNode state = getJson(cashier, "/api/ops/shift");
        assertEquals(32000, state.get("shift").get("transferSales").asInt());
        assertEquals(1, state.get("shift").get("transferCount").asInt());
        assertEquals(500000 + 32000, state.get("expected").asInt()); // tiền mặt: đầu ca + đơn tiền mặt, không có chuyển khoản

        // nhân viên phụ trách: thu ngân chọn lúc đăng nhập, chỉ được là người đang chấm công
        assertEquals(0, getJson(cashier, "/api/auth/on-duty?role=CASHIER").size());
        cashier.setAttribute(AuthController.STAFF_KEY, 2);
        fail(cashier, "/api/ops/takeaway", cash + "}", 422, "NOT_ON_DUTY");
        jdbc.update("INSERT INTO attendance (employee_id, shift, check_in_time) VALUES (2, 'MORNING', UTC_TIMESTAMP())");
        try {
            assertEquals(2, getJson(cashier, "/api/auth/on-duty?role=CASHIER").get(0).get("id").asInt());
            int staffOrder = postJson(cashier, "/api/ops/takeaway", cash + "}").get("id").asInt();
            assertEquals(2, jdbc.queryForObject("SELECT issued_by FROM invoice WHERE order_id = ?", Integer.class, staffOrder));
            assertEquals(2, jdbc.queryForObject("SELECT created_by FROM orders WHERE order_id = ?", Integer.class, staffOrder));
            cashier.setAttribute(AuthController.STAFF_KEY, 3); // thu ngân khác chưa chấm công
            fail(cashier, "/api/ops/takeaway", cash + "}", 422, "NOT_ON_DUTY");
            cashier.setAttribute(AuthController.STAFF_KEY, 9); // tài khoản quầy không phải người
            fail(cashier, "/api/ops/takeaway", cash + "}", 422, "NOT_ON_DUTY");
        } finally {
            cashier.removeAttribute(AuthController.STAFF_KEY);
            jdbc.update("DELETE FROM attendance");
        }
    }

    /** Chốt ca bị chặn khi còn đơn mang đi chưa giao khách, giống đơn nháp; giao xong mới chốt được. */
    @Test
    void undeliveredTakeawayBlocksClosingTheShift() throws Exception {
        openShift();
        int id = postJson(cashier, "/api/ops/takeaway", "{\"lines\":[" + line(2, 1, "M", "COLD", null) + "],\"method\":\"CASH\",\"received\":50000}").get("id").asInt();
        assertEquals(1, getJson(cashier, "/api/ops/shift").get("undelivered").asInt());
        fail(cashier, "/api/ops/shift/close", "{\"actualCash\":532000}", 409, "UNDELIVERED");
        int lineId = firstKitchenLine("NEW");
        postJson(barista, "/api/ops/kitchen/" + lineId + "/start", null);
        postJson(barista, "/api/ops/kitchen/" + lineId + "/done", null);
        fail(cashier, "/api/ops/shift/close", "{\"actualCash\":532000}", 409, "UNDELIVERED"); // pha xong vẫn chưa giao
        postJson(cashier, "/api/ops/orders/" + id + "/handover", null);
        assertEquals(0, getJson(cashier, "/api/ops/shift").get("undelivered").asInt());
        postJson(cashier, "/api/ops/shift/close", "{\"actualCash\":532000}");
    }
}
