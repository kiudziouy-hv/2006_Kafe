package vn.vtph.coffee.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import vn.vtph.coffee.support.AbstractMySqlIT;

/**
 * Các module quản trị trên MySQL thật: nhân sự, thực đơn, kho, khuyến mãi, thành viên và điểm, hóa đơn/hoàn tiền,
 * chấm công, chốt ngày, báo cáo. Dữ liệu mẫu: tài khoản 2 Thu ngân, 4 Phục vụ, 7 Pha chế (PIN: Phục vụ 123456, Lê Hoàng Cường34567, Pha chế 345678), owner/admin123;
 * món 1 Cà phê đen (M 29.000, L 36.000), 2 Cà phê sữa (M 32.000, L 39.000); thành viên 1 có 24 điểm.
 */
class MySqlAdminIntegrationTest extends AbstractMySqlIT {
    private static final ObjectMapper JSON = new ObjectMapper();
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    MockHttpSession owner, cashier, barista, waiter;

    @BeforeEach
    void reset() throws Exception {
        jdbc.execute((java.sql.Connection c) -> {
            try (var st = c.createStatement()) {
                st.execute("SET FOREIGN_KEY_CHECKS = 0");
                for (String t : List.of("point_transaction", "refund_record", "invoice", "order_line_topping", "order_line", "waste_record", "stock_adjustment",
                        "order_batch", "takeaway_order", "dine_in_order", "orders", "cashier_session", "attendance_edit", "attendance"))
                    st.execute("TRUNCATE TABLE " + t);
                st.execute("SET FOREIGN_KEY_CHECKS = 1");
            }
            return null;
        });
        jdbc.update("UPDATE dining_table SET status = 'EMPTY'");
        owner = new MockHttpSession();
        send(owner, "POST", "/api/auth/owner/login", "{\"username\":\"owner\",\"password\":\"admin123\"}", 200);
        cashier = staff(2);
        barista = staff(7);
        waiter = staff(4);
    }

    /** Xóa dữ liệu mà test thêm vào để các lớp test khác thấy đúng dữ liệu mẫu. */
    @AfterEach
    void cleanup() {
        jdbc.execute((java.sql.Connection c) -> {
            try (var st = c.createStatement()) {
                st.execute("SET FOREIGN_KEY_CHECKS = 0");
                st.execute("DELETE FROM account WHERE account_id > 10");
                st.execute("DELETE FROM employee WHERE employee_id > 10");
                st.execute("DELETE FROM recipe_line WHERE recipe_id IN (SELECT recipe_id FROM recipe WHERE item_id > 30)");
                st.execute("DELETE FROM recipe WHERE item_id > 30");
                st.execute("DELETE FROM menu_item_topping WHERE item_id > 30");
                st.execute("DELETE FROM item_size WHERE item_id > 30");
                st.execute("DELETE FROM menu_item WHERE item_id > 30");
                st.execute("DELETE FROM promotion WHERE promotion_id > 2");
                st.execute("DELETE FROM customer WHERE customer_id > 3");
                st.execute("DELETE FROM ingredient WHERE ingredient_id > 37");
                st.execute("SET FOREIGN_KEY_CHECKS = 1");
            }
            return null;
        });
    }

    private MockHttpSession staff(int accountId) throws Exception {
        jdbc.update("UPDATE account SET failed_attempts = 0, locked_until = NULL, status = 'ACTIVE' WHERE account_id = ?", accountId);
        MockHttpSession s = new MockHttpSession();
        send(s, "POST", "/api/auth/staff/login", "{\"accountId\":" + accountId + ",\"pin\":\"" + (accountId == 3 ? "456789" : accountId <= 3 ? "234567" : accountId >= 7 ? "345678" : "123456") + "\"}", 200);
        return s;
    }

    private JsonNode send(MockHttpSession s, String method, String url, String body, int expected) throws Exception {
        MockHttpServletRequestBuilder b = switch (method) {
            case "POST" -> post(url).contentType(MediaType.APPLICATION_JSON).content(body == null ? "{}" : body);
            case "PUT" -> put(url).contentType(MediaType.APPLICATION_JSON).content(body == null ? "{}" : body);
            case "DELETE" -> delete(url);
            default -> get(url);
        };
        String out = mvc.perform(b.session(s)).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return out.isBlank() ? JSON.nullNode() : JSON.readTree(out);
    }

    private JsonNode ok(MockHttpSession s, String method, String url, String body) throws Exception { return send(s, method, url, body, 200); }

    private void rule(MockHttpSession s, String method, String url, String body, int status, String code) throws Exception {
        assertEquals(code, send(s, method, url, body, status).get("code").asText());
    }

    private static String line(int item, int qty, String size) {
        return "{\"itemId\":" + item + ",\"qty\":" + qty + ",\"size\":\"" + size + "\",\"temp\":\"COLD\",\"sugar\":\"50\",\"ice\":\"NORMAL\"}";
    }

    private JsonNode takeaway(String body) throws Exception { return ok(cashier, "POST", "/api/ops/takeaway", body); }

    private void openShift() throws Exception { ok(cashier, "POST", "/api/ops/shift/open", "{\"type\":\"MORNING\",\"openingCash\":500000}"); }

    private int points(int customerId) { return jdbc.queryForObject("SELECT points FROM customer WHERE customer_id = ?", Integer.class, customerId); }

    private double stock(String name) { return jdbc.queryForObject("SELECT current_stock FROM ingredient WHERE name = ?", Double.class, name); }

    // ---------- khuyến mãi, điểm, hóa đơn, hoàn tiền ----------
    @Test
    void promotionAndPointsAreAppliedInOrderOfBr021() throws Exception {
        openShift();
        ok(owner, "POST", "/api/promotions", "{\"name\":\"Coffee 20\",\"group\":\"COFFEE\",\"discountPercent\":20,\"dailyStart\":\"00:00\",\"dailyEnd\":\"23:59\"}");
        String body = "\"lines\":[" + line(2, 2, "M") + "," + line(1, 1, "L") + "]";

        JsonNode quote = ok(cashier, "POST", "/api/ops/takeaway/quote", "{" + body + "}");
        assertEquals(100000, quote.get("total").asInt());
        assertEquals(20000, quote.get("discount").asInt());
        assertEquals(24, quote.get("maxPoints").asInt()); // 30% của 80.000 = 24.000đ

        rule(cashier, "POST", "/api/ops/takeaway", "{\"method\":\"CASH\",\"received\":500000,\"customerId\":1,\"points\":25," + body + "}", 422, "NOT_ENOUGH_POINTS");
        rule(cashier, "POST", "/api/ops/takeaway", "{\"method\":\"CASH\",\"received\":500000,\"customerId\":2,\"points\":1," + body + "}", 422, "NOT_ENOUGH_POINTS");

        JsonNode o = takeaway("{\"method\":\"CASH\",\"received\":500000,\"customerId\":1,\"points\":5," + body + "}");
        assertEquals(75000, o.get("rounded").asInt()); // 100.000 - 20.000 - 5.000
        assertEquals(7, o.get("pointsEarned").asInt()); // 75.000 / 10.000 = 7 điểm
        assertEquals(20, o.get("lines").get(0).get("discountPercent").asInt());
        assertEquals(24 - 5 + 7, points(1));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM point_transaction WHERE type = 'REDEEM' AND points = 5", Integer.class));

        // giá và khuyến mãi đã chốt: tắt chương trình không đổi hóa đơn đã phát hành
        jdbc.update("UPDATE promotion SET active = 0");
        int inv = jdbc.queryForObject("SELECT invoice_id FROM invoice", Integer.class);
        assertEquals(20000, send(owner, "GET", "/api/invoices/" + inv, null, 200).get("promotionDiscount").asInt());
    }

    @Test
    void partialRefundThenCancelInvoiceRestoresPointsAndCash() throws Exception {
        openShift();
        ok(owner, "POST", "/api/promotions", "{\"name\":\"Coffee 20\",\"group\":\"COFFEE\",\"discountPercent\":20,\"dailyStart\":\"00:00\",\"dailyEnd\":\"23:59\"}");
        JsonNode o = takeaway("{\"method\":\"CASH\",\"received\":500000,\"customerId\":1,\"points\":5,\"lines\":[" + line(2, 2, "M") + "," + line(1, 1, "L") + "]}");
        int inv = jdbc.queryForObject("SELECT invoice_id FROM invoice", Integer.class);
        int blackCoffee = o.get("lines").get(1).get("id").asInt();
        int milkCoffee = o.get("lines").get(0).get("id").asInt();

        rule(cashier, "POST", "/api/invoices/" + inv + "/lines/" + blackCoffee + "/cancel", "{\"reason\":\"x\"}", 403, "FORBIDDEN");
        rule(owner, "POST", "/api/invoices/" + inv + "/lines/" + blackCoffee + "/cancel", "{}", 422, "REASON_REQUIRED");
        JsonNode d = ok(owner, "POST", "/api/invoices/" + inv + "/lines/" + blackCoffee + "/cancel", "{\"reason\":\"Khách đổi ý\"}");
        JsonNode refund = d.get("refunds").get(0);
        assertEquals("PARTIAL", refund.get("type").asText());
        assertEquals(28000, refund.get("cashAmount").asInt()); // 36.000 - 20% = 28.800; hoàn 1 điểm; 27.800 làm tròn 28.000
        assertEquals(1, refund.get("pointsRefunded").asInt());
        assertEquals(24, points(1)); // 26 + 1 hoàn - 3 thu hồi (tích lại theo 47.000 -> 4 điểm)
        rule(owner, "POST", "/api/invoices/" + inv + "/lines/" + milkCoffee + "/cancel", "{\"reason\":\"x\"}", 409, "LAST_LINE");

        // tiền mặt dự kiến của ca giảm theo hoàn tiền một phần (BR-036)
        assertEquals(500000 + 75000 - 28000, ok(cashier, "GET", "/api/ops/shift", null).get("expected").asInt());

        JsonNode c = ok(owner, "POST", "/api/invoices/" + inv + "/cancel", "{\"reason\":\"Khách trả lại\"}");
        assertEquals("CANCELLED", c.get("status").asText());
        assertEquals(24, points(1)); // điểm khách quay về như trước giao dịch
        assertEquals(47000, c.get("refunds").get(1).get("cashAmount").asInt());
        assertEquals(500000, ok(cashier, "GET", "/api/ops/shift", null).get("expected").asInt());
        rule(owner, "POST", "/api/invoices/" + inv + "/cancel", "{\"reason\":\"x\"}", 409, "ALREADY_CANCELLED");

        int refundId = c.get("refunds").get(1).get("id").asInt();
        ok(owner, "POST", "/api/invoices/refunds/" + refundId + "/confirm", null);
        rule(owner, "POST", "/api/invoices/refunds/" + refundId + "/confirm", null, 409, "ALREADY_CONFIRMED");
        rule(cashier, "POST", "/api/invoices/" + inv + "/cancel", "{\"reason\":\"x\"}", 403, "FORBIDDEN");
    }

    @Test
    void reprintCountsAndReportSubtractsPartialRefunds() throws Exception {
        openShift();
        JsonNode o = takeaway("{\"method\":\"CASH\",\"received\":200000,\"lines\":[" + line(2, 1, "M") + "," + line(1, 1, "M") + "]}");
        int inv = jdbc.queryForObject("SELECT invoice_id FROM invoice", Integer.class);
        assertEquals(1, ok(cashier, "POST", "/api/invoices/" + inv + "/reprint", null).get("reprintCount").asInt());
        ok(owner, "POST", "/api/invoices/" + inv + "/lines/" + o.get("lines").get(1).get("id").asInt() + "/cancel", "{\"reason\":\"Hết món\"}");
        JsonNode r = ok(owner, "GET", "/api/reports/summary", null);
        assertEquals(61000 - 29000, r.get("revenue").asInt()); // 32.000 + 29.000 trừ hoàn 29.000
        assertEquals(1, r.get("invoices").asInt());
        assertEquals(1, r.get("itemsSold").asInt()); // dòng đã hủy không tính (BR-041)
        assertEquals(1, r.get("daily").get(0).get("items").asInt()); // số lượng theo ngày khớp tổng
        rule(cashier, "GET", "/api/reports/summary", null, 403, "FORBIDDEN");
        rule(owner, "GET", "/api/reports/summary?from=2026-10-10&to=2026-10-01", null, 422, "BAD_RANGE");
    }

    @Test
    void memberRegistrationAndLookup() throws Exception {
        rule(cashier, "POST", "/api/customers", "{\"fullName\":\"A\",\"phone\":\"123\"}", 422, "BAD_PHONE");
        rule(cashier, "POST", "/api/customers", "{\"fullName\":\"Trùng\",\"phone\":\"0912345678\"}", 409, "DUPLICATE_PHONE");
        ok(cashier, "POST", "/api/customers", "{\"fullName\":\"Khách Mới\",\"phone\":\"0999888777\"}");
        JsonNode m = ok(cashier, "GET", "/api/customers/lookup?phone=0999888777", null);
        assertEquals("Khách Mới", m.get("fullName").asText());
        assertEquals(0, m.get("points").asInt());
        rule(cashier, "GET", "/api/customers/lookup?phone=0900000000", null, 404, "NO_CUSTOMER");
        rule(waiter, "GET", "/api/customers/lookup?phone=0999888777", null, 403, "FORBIDDEN");
    }

    @Test
    void promotionRulesAreValidated() throws Exception {
        rule(owner, "POST", "/api/promotions", "{\"name\":\"x\",\"group\":\"TEA\",\"discountPercent\":80,\"dailyStart\":\"10:00\",\"dailyEnd\":\"11:00\"}", 422, "BAD_PERCENT");
        rule(owner, "POST", "/api/promotions", "{\"name\":\"x\",\"group\":\"TEA\",\"discountPercent\":10,\"startDate\":\"2026-02-02\",\"endDate\":\"2026-02-01\",\"dailyStart\":\"10:00\",\"dailyEnd\":\"11:00\"}", 422, "BAD_DATE");
        rule(waiter, "GET", "/api/promotions", null, 403, "FORBIDDEN");
    }

    // ---------- nhân sự, chấm công ----------
    @Test
    void staffLifecycleAndLocking() throws Exception {
        rule(cashier, "GET", "/api/staff", null, 403, "FORBIDDEN");
        rule(owner, "POST", "/api/staff", "{\"fullName\":\"Sai\",\"role\":\"WAITER\",\"secret\":\"12\"}", 422, "BAD_SECRET");
        JsonNode created = ok(owner, "POST", "/api/staff", "{\"fullName\":\"Nhân Viên Mới\",\"role\":\"WAITER\",\"phone\":\"0911222333\",\"secret\":\"654321\"}");
        int emp = created.get("id").asInt(), acc = created.get("accountId").asInt();
        send(new MockHttpSession(), "POST", "/api/auth/staff/login", "{\"accountId\":" + acc + ",\"pin\":\"654321\"}", 200);

        MockHttpSession live = new MockHttpSession(); // phiên đã đăng nhập trước khi bị khóa
        send(live, "POST", "/api/auth/staff/login", "{\"accountId\":" + acc + ",\"pin\":\"654321\"}", 200);
        ok(owner, "POST", "/api/staff/" + emp + "/lock", null);
        rule(live, "GET", "/api/ops/tables", null, 401, "ACCOUNT_LOCKED");
        rule(new MockHttpSession(), "POST", "/api/auth/staff/login", "{\"accountId\":" + acc + ",\"pin\":\"654321\"}", 423, "ACCOUNT_LOCKED");
        ok(owner, "POST", "/api/staff/" + emp + "/secret", "{\"secret\":\"111222\"}");
        ok(owner, "POST", "/api/staff/" + emp + "/unlock", null);
        send(new MockHttpSession(), "POST", "/api/auth/staff/login", "{\"accountId\":" + acc + ",\"pin\":\"111222\"}", 200);
        rule(owner, "POST", "/api/staff/1/lock", null, 409, "SELF_LOCK");

        // UC-03: mỗi người tự cập nhật thông tin của mình
        JsonNode me = ok(cashier, "PUT", "/api/staff/me", "{\"fullName\":\"Hồ Quốc Tiến\",\"phone\":\"0909090909\",\"email\":\"tien@vtph.vn\"}");
        assertEquals("0909090909", me.get("phone").asText());
        rule(cashier, "PUT", "/api/staff/me", "{\"fullName\":\"X\",\"email\":\"khong-hop-le\"}", 422, "BAD_EMAIL");
    }

    @Test
    void attendanceCheckInOutAndAuditedEdits() throws Exception {
        MockHttpSession anon = new MockHttpSession();
        rule(anon, "POST", "/api/auth/attendance/in", "{\"accountId\":2,\"pin\":\"000000\",\"shift\":\"MORNING\"}", 401, "WRONG_SECRET");
        rule(anon, "POST", "/api/auth/attendance/in", "{\"accountId\":2,\"pin\":\"234567\",\"shift\":\"MORNING\",\"role\":\"WAITER\"}", 422, "WRONG_ROLE"); // tên không thuộc vai trò đã chọn
        ok(anon, "POST", "/api/auth/attendance/in", "{\"accountId\":2,\"pin\":\"234567\",\"shift\":\"MORNING\",\"role\":\"CASHIER\"}");
        rule(anon, "POST", "/api/auth/attendance/in", "{\"accountId\":2,\"pin\":\"234567\",\"shift\":\"MORNING\"}", 409, "ALREADY_IN");
        rule(owner, "POST", "/api/auth/attendance/out", "{\"accountId\":4,\"pin\":\"123456\"}", 409, "NOT_IN");
        ok(anon, "POST", "/api/auth/attendance/out", "{\"accountId\":2,\"pin\":\"234567\"}");
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM cashier_session", Integer.class)); // chấm công không mở ca (ASM-17)
        // tài khoản quầy dùng chung (9 = thu ngân, 10 = pha chế) đăng nhập thao tác được nhưng không chấm công
        rule(anon, "POST", "/api/auth/attendance/in", "{\"accountId\":9,\"pin\":\"234567\",\"shift\":\"MORNING\"}", 422, "STATION_ACCOUNT");
        rule(anon, "POST", "/api/auth/attendance/out", "{\"accountId\":10,\"pin\":\"345678\"}", 422, "STATION_ACCOUNT");

        JsonNode rec = ok(owner, "GET", "/api/attendance", null).get(0);
        int id = rec.get("id").asInt();
        String checkIn = rec.get("checkIn").asText();
        rule(cashier, "PUT", "/api/attendance/" + id, "{\"shift\":\"EVENING\"}", 403, "FORBIDDEN");
        rule(owner, "PUT", "/api/attendance/" + id, "{\"shift\":\"EVENING\",\"checkOut\":\"" + java.time.Instant.parse(checkIn).minusSeconds(60) + "\"}", 422, "BAD_TIME");
        ok(owner, "PUT", "/api/attendance/" + id, "{\"shift\":\"EVENING\"}");
        JsonNode history = ok(owner, "GET", "/api/attendance/" + id + "/history", null);
        assertEquals(1, history.size());
        assertTrue(history.get(0).get("oldValue").asText().contains("MORNING"));
        assertTrue(history.get(0).get("newValue").asText().contains("EVENING"));
    }

    // ---------- thực đơn ----------
    @Test
    void menuAndToppingManagement() throws Exception {
        rule(waiter, "GET", "/api/admin/items", null, 403, "FORBIDDEN");
        rule(owner, "POST", "/api/admin/items", "{\"name\":\"Bánh nóng\",\"group\":\"CAKE\",\"allowHot\":true,\"sizes\":[{\"size\":\"M\",\"price\":1000}]}", 422, "BAD_TEMP");
        rule(owner, "POST", "/api/admin/items", "{\"name\":\"Trống\",\"group\":\"TEA\",\"sizes\":[]}", 422, "NO_SIZE");
        JsonNode item = ok(owner, "POST", "/api/admin/items", "{\"name\":\"Latte Test\",\"group\":\"COFFEE\",\"allowHot\":true,\"allowCold\":true,\"sizes\":[{\"size\":\"M\",\"price\":45000}],\"toppingIds\":[3]}");
        int id = item.get("id").asInt();
        ok(owner, "PUT", "/api/admin/items/" + id, "{\"name\":\"Latte Test\",\"group\":\"COFFEE\",\"allowHot\":true,\"allowCold\":true,\"sizes\":[{\"size\":\"M\",\"price\":47000},{\"size\":\"L\",\"price\":54000}],\"toppingIds\":[]}");
        JsonNode menu = ok(waiter, "GET", "/api/ops/menu", null);
        boolean listed = false;
        for (JsonNode i : menu.get("items")) if (i.get("id").asInt() == id) { listed = true; assertEquals(2, i.get("sizes").size()); }
        assertTrue(listed);

        // Hết hàng do Chủ quán đặt (BR-006) và Ngừng bán (BR-007)
        JsonNode off = ok(owner, "POST", "/api/admin/items/" + id + "/sizes/M/status", "{\"status\":\"OUT_OF_STOCK\"}");
        assertEquals("OWNER_MANAGER", off.get("sizes").get(0).get("statusSource").asText());
        assertEquals("STOPPED", ok(owner, "POST", "/api/admin/items/" + id + "/status", "{\"status\":\"STOPPED\"}").get("status").asText());

        JsonNode top = ok(owner, "POST", "/api/admin/toppings", "{\"name\":\"Topping thử nghiệm\",\"surcharge\":10000,\"itemIds\":[" + id + "]}");
        assertEquals(1, top.get("itemIds").size());
        rule(owner, "POST", "/api/admin/toppings", "{\"name\":\"Topping thử nghiệm\",\"surcharge\":5000,\"itemIds\":[]}", 409, "DUPLICATE");
        jdbc.update("DELETE FROM menu_item_topping WHERE topping_id = ?", top.get("id").asInt());
        jdbc.update("DELETE FROM topping WHERE topping_id = ?", top.get("id").asInt());
    }

    /** ASM-22: chỉ xóa món chưa từng phát sinh giao dịch; món đã có dòng món phải chuyển Ngừng bán (BR-007). */
    @Test
    void anItemCanOnlyBeDeletedWhenItNeverHadTransactions() throws Exception {
        String body = "{\"name\":\"Món xóa thử\",\"group\":\"COFFEE\",\"allowHot\":true,\"allowCold\":true,\"sizes\":[{\"size\":\"M\",\"price\":30000}],\"toppingIds\":[3]}";
        int fresh = ok(owner, "POST", "/api/admin/items", body).get("id").asInt();
        ok(owner, "PUT", "/api/inventory/recipe", "{\"itemId\":" + fresh + ",\"size\":\"M\",\"lines\":[{\"ingredientId\":1,\"quantity\":10}]}");
        rule(waiter, "DELETE", "/api/admin/items/" + fresh, null, 403, "FORBIDDEN");
        rule(owner, "DELETE", "/api/admin/items/9999", null, 404, "NO_ITEM");
        send(owner, "DELETE", "/api/admin/items/" + fresh, null, 204);
        for (String t : List.of("menu_item WHERE item_id", "item_size WHERE item_id", "menu_item_topping WHERE item_id", "recipe WHERE item_id"))
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM " + t + " = ?", Integer.class, fresh), t);
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM recipe_line rl LEFT JOIN recipe r ON r.recipe_id = rl.recipe_id WHERE r.recipe_id IS NULL", Integer.class));

        int used = ok(owner, "POST", "/api/admin/items", body).get("id").asInt();
        openShift();
        ok(waiter, "POST", "/api/ops/tables/5/orders", "{\"lines\":[" + line(used, 1, "M") + "]}");
        rule(owner, "DELETE", "/api/admin/items/" + used, null, 409, "ITEM_HAS_HISTORY");
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM menu_item WHERE item_id = ?", Integer.class, used));
        assertEquals("STOPPED", ok(owner, "POST", "/api/admin/items/" + used + "/status", "{\"status\":\"STOPPED\"}").get("status").asText());
    }

    // ---------- kho ----------
    @Test
    void inventoryStockInRecipesAdjustmentsAndAutoResell() throws Exception {
        rule(cashier, "GET", "/api/inventory/ingredients", null, 403, "FORBIDDEN");
        rule(owner, "POST", "/api/inventory/receipts", "{\"lines\":[{\"ingredientId\":3,\"quantity\":100}]}", 422, "EXPIRY_REQUIRED"); // sữa tươi cần hạn dùng

        // Hết hàng do hệ thống: nhập kho đủ thì tự bán lại, còn do Chủ quán đặt thì giữ nguyên (BR-006)
        jdbc.update("UPDATE ingredient SET current_stock = 0 WHERE name = 'Đường'");
        jdbc.update("UPDATE item_size SET status = 'OUT_OF_STOCK', status_source = 'SYSTEM' WHERE item_id = 1 AND size = 'M'");
        jdbc.update("UPDATE item_size SET status = 'OUT_OF_STOCK', status_source = 'OWNER_MANAGER' WHERE item_id = 1 AND size = 'L'");
        int sugar = jdbc.queryForObject("SELECT ingredient_id FROM ingredient WHERE name = 'Đường'", Integer.class);
        JsonNode r = ok(owner, "POST", "/api/inventory/receipts", "{\"lines\":[{\"ingredientId\":" + sugar + ",\"quantity\":5000}]}");
        assertTrue(r.get("resold").asInt() >= 1);
        assertEquals("SELLING", jdbc.queryForObject("SELECT status FROM item_size WHERE item_id = 1 AND size = 'M'", String.class));
        assertEquals("OUT_OF_STOCK", jdbc.queryForObject("SELECT status FROM item_size WHERE item_id = 1 AND size = 'L'", String.class));
        assertEquals(5000.0, stock("Đường"));

        // Điều chỉnh sau kiểm kê cần lý do và lưu tồn trước/sau
        rule(owner, "POST", "/api/inventory/adjustments", "{\"ingredientId\":" + sugar + ",\"actual\":4800}", 422, "REQUIRED");
        ok(owner, "POST", "/api/inventory/adjustments", "{\"ingredientId\":" + sugar + ",\"actual\":4800,\"reason\":\"Kiểm kê\"}");
        assertEquals(4800.0, stock("Đường"));
        JsonNode adj = ok(owner, "GET", "/api/inventory/adjustments", null).get(0);
        assertEquals(5000.0, adj.get("quantityBefore").asDouble());
        assertEquals(4800.0, adj.get("quantityAfter").asDouble());

        // Công thức: thay thế toàn bộ dòng định lượng của một kích thước món (dùng món tạo riêng để không đụng dữ liệu mẫu)
        int own = ok(owner, "POST", "/api/admin/items", "{\"name\":\"Món công thức\",\"group\":\"TEA\",\"allowHot\":false,\"allowCold\":true,\"sizes\":[{\"size\":\"M\",\"price\":30000}]}").get("id").asInt();
        ok(owner, "PUT", "/api/inventory/recipe", "{\"itemId\":" + own + ",\"size\":\"M\",\"lines\":[{\"ingredientId\":" + sugar + ",\"quantity\":12.5}]}");
        ok(owner, "PUT", "/api/inventory/recipe", "{\"itemId\":" + own + ",\"size\":\"M\",\"lines\":[{\"ingredientId\":" + sugar + ",\"quantity\":20}]}");
        JsonNode recipe = ok(owner, "GET", "/api/inventory/recipe?itemId=" + own + "&size=M", null);
        assertEquals(1, recipe.size());
        assertEquals(20.0, recipe.get(0).get("quantity").asDouble());
        rule(owner, "PUT", "/api/inventory/recipe", "{\"itemId\":" + own + ",\"size\":\"M\",\"lines\":[]}", 422, "NO_LINES");
    }

    @Test
    void wasteProposedByBaristaAndConfirmedByOwnerOnly() throws Exception {
        double before = stock("Đường");
        int sugar = jdbc.queryForObject("SELECT ingredient_id FROM ingredient WHERE name = 'Đường'", Integer.class);
        JsonNode w = ok(barista, "POST", "/api/inventory/waste", "{\"ingredientId\":" + sugar + ",\"quantity\":300,\"reason\":\"Đổ nhầm\"}");
        assertEquals("PROPOSED", w.get("status").asText());
        assertEquals(before, stock("Đường")); // chỉ đề xuất, chưa trừ kho
        rule(barista, "POST", "/api/inventory/waste/" + w.get("id").asInt() + "/confirm", null, 403, "FORBIDDEN");
        JsonNode done = ok(owner, "POST", "/api/inventory/waste/" + w.get("id").asInt() + "/confirm", null);
        assertEquals("CONFIRMED", done.get("status").asText());
        assertEquals(before - 300, stock("Đường"));
        rule(owner, "POST", "/api/inventory/waste/" + w.get("id").asInt() + "/confirm", null, 409, "NOT_PROPOSED");

        JsonNode big = ok(barista, "POST", "/api/inventory/waste", "{\"ingredientId\":" + sugar + ",\"quantity\":9999999,\"reason\":\"Quá lớn\"}");
        rule(owner, "POST", "/api/inventory/waste/" + big.get("id").asInt() + "/confirm", null, 409, "NOT_ENOUGH_STOCK"); // BR-011
        assertFalse(ok(owner, "GET", "/api/inventory/alerts", null).get("expiring").isNull());
    }

    // ---------- ca và chốt ngày ----------
    @Test
    void dayCannotBeClosedWhileShiftOpenAndOwnerCanCloseShift() throws Exception {
        openShift();
        rule(owner, "POST", "/api/shift/day/close", null, 409, "NO_EVENING");
        rule(cashier, "GET", "/api/shift/day", null, 403, "FORBIDDEN");
        JsonNode state = ok(owner, "GET", "/api/shift/day", null);
        assertEquals("OPEN", state.get("status").asText());
        assertFalse(state.get("canClose").asBoolean());

        // Chủ quán chốt thay phiên ca đang mở (FR-M10-007)
        JsonNode closed = ok(owner, "POST", "/api/ops/shift/close", "{\"actualCash\":500000}");
        assertFalse(closed.get("open").asBoolean());
        assertEquals(0, closed.get("diff").asInt());
        rule(owner, "POST", "/api/shift/day/close", null, 409, "NO_EVENING"); // chốt ngày chỉ ở ca tối (BR-037)

        // Ca tối đã chốt, không còn đơn mở và bàn trống: chốt ngày được; sau đó ca/ngày bị khóa (BR-038)
        ok(cashier, "POST", "/api/ops/shift/open", "{\"type\":\"EVENING\",\"openingCash\":100000}");
        ok(owner, "POST", "/api/ops/shift/close", "{\"actualCash\":100000}");
        JsonNode day = ok(owner, "POST", "/api/shift/day/close", "{\"note\":\"Cuối ngày ổn, không lệch tiền\"}");
        assertEquals("CLOSED", day.get("status").asText());
        assertEquals("Cuối ngày ổn, không lệch tiền", day.get("note").asText());
        rule(cashier, "POST", "/api/ops/shift/open", "{\"type\":\"MORNING\",\"openingCash\":0}", 409, "DAY_CLOSED");
    }

    // ---------- chấm công của Chủ quán/Quản lý ----------
    @Test
    void ownerClocksInAndOutWithoutPin() throws Exception {
        assertEquals(0, ok(owner, "GET", "/api/attendance/me", null).size());
        rule(owner, "POST", "/api/attendance/me/in", "{\"shift\":\"NOON\"}", 422, "BAD_SHIFT");
        rule(owner, "POST", "/api/attendance/me/out", null, 409, "NOT_IN");
        ok(owner, "POST", "/api/attendance/me/in", "{\"shift\":\"MORNING\"}");
        assertEquals("MORNING", ok(owner, "GET", "/api/attendance/me", null).get("shift").asText());
        rule(owner, "POST", "/api/attendance/me/in", "{\"shift\":\"EVENING\"}", 409, "ALREADY_IN");
        ok(owner, "POST", "/api/attendance/me/out", null);
        assertEquals(0, ok(owner, "GET", "/api/attendance/me", null).size());
        rule(cashier, "POST", "/api/attendance/me/in", "{\"shift\":\"MORNING\"}", 403, "FORBIDDEN");
    }
}
