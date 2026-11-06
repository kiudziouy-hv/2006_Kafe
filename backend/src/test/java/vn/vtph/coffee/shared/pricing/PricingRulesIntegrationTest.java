package vn.vtph.coffee.shared.pricing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
 * Characterization tests của quy tắc tính giá/điểm (BR-018..BR-023, BR-027) qua API thật trên MySQL.
 * Viết TRƯỚC khi gom logic vào {@code PricingPolicy}: các giá trị kỳ vọng là hành vi quan sát được của mã cũ.
 * Dữ liệu mẫu: món 1 Cà phê đen (M 29.000), món 2 Cà phê sữa (M 32.000, L 39.000), thành viên 1.
 */
class PricingRulesIntegrationTest extends AbstractMySqlIT {
    private static final ObjectMapper JSON = new ObjectMapper();
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    MockHttpSession owner, cashier, waiter;

    @BeforeEach
    void reset() throws Exception {
        jdbc.execute((java.sql.Connection c) -> {
            try (var st = c.createStatement()) {
                st.execute("SET FOREIGN_KEY_CHECKS = 0");
                for (String t : List.of("point_transaction", "refund_record", "invoice_reprint", "invoice", "order_line_topping", "order_line", "waste_record", "stock_adjustment",
                        "order_batch", "takeaway_order", "dine_in_order", "orders", "cashier_session", "attendance_edit", "attendance"))
                    st.execute("TRUNCATE TABLE " + t);
                st.execute("SET FOREIGN_KEY_CHECKS = 1");
            }
            return null;
        });
        jdbc.update("UPDATE dining_table SET status = 'EMPTY'");
        owner = new MockHttpSession();
        send(owner, "POST", "/api/auth/owner/login", "{\"username\":\"owner\",\"password\":\"admin123\"}", 200);
        cashier = staff(2, "234567");
        waiter = staff(4, "123456");
    }

    @AfterEach
    void cleanup() {
        jdbc.execute((java.sql.Connection c) -> {
            try (var st = c.createStatement()) {
                st.execute("SET FOREIGN_KEY_CHECKS = 0");
                st.execute("DELETE FROM promotion WHERE promotion_id > 2");
                st.execute("DELETE FROM menu_item_topping WHERE item_id > 30");
                st.execute("DELETE FROM item_size WHERE item_id > 30");
                st.execute("DELETE FROM menu_item WHERE item_id > 30");
                st.execute("SET FOREIGN_KEY_CHECKS = 1");
            }
            return null;
        });
    }

    private MockHttpSession staff(int accountId, String pin) throws Exception {
        jdbc.update("UPDATE account SET failed_attempts = 0, locked_until = NULL, status = 'ACTIVE' WHERE account_id = ?", accountId);
        MockHttpSession s = new MockHttpSession();
        send(s, "POST", "/api/auth/staff/login", "{\"accountId\":" + accountId + ",\"pin\":\"" + pin + "\"}", 200);
        return s;
    }

    private JsonNode send(MockHttpSession s, String method, String url, String body, int expected) throws Exception {
        MockHttpServletRequestBuilder b = method.equals("POST") ? post(url).contentType(MediaType.APPLICATION_JSON).content(body == null ? "{}" : body) : get(url);
        String out = mvc.perform(b.session(s)).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return out.isBlank() ? JSON.nullNode() : JSON.readTree(out);
    }

    private static String line(int item, int qty, String size) {
        return "{\"itemId\":" + item + ",\"qty\":" + qty + ",\"size\":\"" + size + "\",\"temp\":\"COLD\",\"sugar\":\"50\",\"ice\":\"NORMAL\"}";
    }

    private void openShift() throws Exception { send(cashier, "POST", "/api/ops/shift/open", "{\"type\":\"MORNING\",\"openingCash\":500000}", 200); }

    private void coffeePromotion(int percent) throws Exception {
        send(owner, "POST", "/api/promotions", "{\"name\":\"Coffee " + percent + "\",\"group\":\"COFFEE\",\"discountPercent\":" + percent
                + ",\"dailyStart\":\"00:00\",\"dailyEnd\":\"23:59\"}", 200);
    }

    private int points(int customerId) { return jdbc.queryForObject("SELECT points FROM customer WHERE customer_id = ?", Integer.class, customerId); }

    private Map<String, Object> lastInvoice() { return jdbc.queryForMap("SELECT subtotal, promotion_discount, points_used, total, points_earned FROM invoice ORDER BY invoice_id DESC LIMIT 1"); }

    /** Giảm 25% trên 29.000đ = 7.250đ; còn 21.750đ nằm đúng giữa hai mức 500đ nên làm tròn LÊN thành 22.000đ (BR-021 bước 4). */
    @Test
    void dineInOrderShowsPromotionDiscountHalfUpRoundingAndPointCap() throws Exception {
        coffeePromotion(25);
        JsonNode o = send(waiter, "POST", "/api/ops/tables/5/orders", "{\"lines\":[" + line(1, 1, "M") + "]}", 200);
        assertEquals(29000, o.get("total").asInt());
        assertEquals(7250, o.get("discount").asInt());
        assertEquals(21750, o.get("afterPromo").asInt());
        assertEquals(22000, o.get("rounded").asInt());
        assertEquals(6, o.get("maxPoints").asInt()); // 30% của 21.750 = 6.525đ -> 6 điểm (làm tròn xuống)
        assertEquals(25, o.get("lines").get(0).get("discountPercent").asInt());
    }

    @Test
    void takeawayQuoteAndPaymentFollowTheSameRulesAndStoreTheInvoiceAmounts() throws Exception {
        openShift();
        coffeePromotion(25);
        JsonNode quote = send(cashier, "POST", "/api/ops/takeaway/quote", "{\"lines\":[" + line(1, 1, "M") + "]}", 200);
        assertEquals(29000, quote.get("total").asInt());
        assertEquals(7250, quote.get("discount").asInt());
        assertEquals(21750, quote.get("afterPromo").asInt());
        assertEquals(6, quote.get("maxPoints").asInt());

        JsonNode o = send(cashier, "POST", "/api/ops/takeaway", "{\"method\":\"CASH\",\"received\":50000,\"customerId\":1,\"points\":0,\"lines\":[" + line(1, 1, "M") + "]}", 200);
        assertEquals(22000, o.get("rounded").asInt());
        assertEquals(2, o.get("pointsEarned").asInt()); // 22.000 / 10.000 = 2 dư 2.000 (phần lẻ không tích)
        Map<String, Object> inv = lastInvoice();
        assertEquals(21750, ((Number) inv.get("subtotal")).intValue()); // cột subtotal lưu số tiền SAU khuyến mãi
        assertEquals(7250, ((Number) inv.get("promotion_discount")).intValue());
        assertEquals(0, ((Number) inv.get("points_used")).intValue());
        assertEquals(22000, ((Number) inv.get("total")).intValue());
        assertEquals(2, ((Number) inv.get("points_earned")).intValue());

        // điểm được trừ TRƯỚC khi làm tròn: 21.750 - 2 x 1.000 = 19.750, vẫn nằm đúng giữa hai mức nên làm tròn lên 20.000
        JsonNode withPoints = send(cashier, "POST", "/api/ops/takeaway", "{\"method\":\"CASH\",\"received\":50000,\"customerId\":1,\"points\":2,\"lines\":[" + line(1, 1, "M") + "]}", 200);
        assertEquals(20000, withPoints.get("rounded").asInt());
        assertEquals(2, withPoints.get("pointsEarned").asInt());
        assertEquals(24 + 2 - 2 + 2, points(1)); // 24 ban đầu, đơn đầu tích 2, đơn này dùng 2 và tích 2
    }

    /** 12.345đ giảm 15% = 1.851,75đ: khuyến mãi bỏ phần lẻ nên còn 1.851đ (không phải 1.852đ); sau điểm còn 8.494đ làm tròn 8.500đ. */
    @Test
    void fractionalPromotionDiscountIsTruncatedPerLine() throws Exception {
        openShift();
        int item = send(owner, "POST", "/api/admin/items",
                "{\"name\":\"Món giá lẻ\",\"group\":\"COFFEE\",\"allowHot\":false,\"allowCold\":true,\"sizes\":[{\"size\":\"M\",\"price\":12345}],\"toppingIds\":[]}", 200).get("id").asInt();
        coffeePromotion(15);
        String lines = "\"lines\":[" + line(item, 1, "M") + "]";
        JsonNode quote = send(cashier, "POST", "/api/ops/takeaway/quote", "{" + lines + "}", 200);
        assertEquals(12345, quote.get("total").asInt());
        assertEquals(1851, quote.get("discount").asInt());
        assertEquals(10494, quote.get("afterPromo").asInt());
        assertEquals(3, quote.get("maxPoints").asInt()); // 3,148 -> 3

        JsonNode o = send(cashier, "POST", "/api/ops/takeaway", "{\"method\":\"CASH\",\"received\":50000,\"customerId\":1,\"points\":2," + lines + "}", 200);
        assertEquals(8500, o.get("rounded").asInt()); // 10.494 - 2.000 = 8.494 -> 8.500
        assertEquals(0, o.get("pointsEarned").asInt()); // 8.500 / 10.000 = 0
        Map<String, Object> inv = lastInvoice();
        assertEquals(10494, ((Number) inv.get("subtotal")).intValue());
        assertEquals(1851, ((Number) inv.get("promotion_discount")).intValue());
        assertEquals(2, ((Number) inv.get("points_used")).intValue());
    }

    /** 3 x 32.000 = 96.000đ; tối đa 30% = 28.800đ -> 28 điểm. Điểm vượt trần bị từ chối, 28 điểm được chấp nhận. */
    @Test
    void pointRedemptionIsCappedAtThirtyPercentRoundedDownAndEarnedPointsDropTheRemainder() throws Exception {
        openShift();
        jdbc.update("UPDATE customer SET points = 100 WHERE customer_id = 1");
        String lines = "\"lines\":[" + line(2, 3, "M") + "]";
        assertEquals(28, send(cashier, "POST", "/api/ops/takeaway/quote", "{" + lines + "}", 200).get("maxPoints").asInt());

        assertEquals("POINTS_LIMIT", send(cashier, "POST", "/api/ops/takeaway", "{\"method\":\"CASH\",\"received\":200000,\"customerId\":1,\"points\":29," + lines + "}", 422).get("code").asText());
        assertEquals("BAD_POINTS", send(cashier, "POST", "/api/ops/takeaway", "{\"method\":\"CASH\",\"received\":200000,\"customerId\":1,\"points\":-1," + lines + "}", 422).get("code").asText());
        assertEquals("NO_CUSTOMER", send(cashier, "POST", "/api/ops/takeaway", "{\"method\":\"CASH\",\"received\":200000,\"points\":1," + lines + "}", 422).get("code").asText());
        assertEquals(100, points(1));

        JsonNode o = send(cashier, "POST", "/api/ops/takeaway", "{\"method\":\"CASH\",\"received\":200000,\"customerId\":1,\"points\":28," + lines + "}", 200);
        assertEquals(68000, o.get("rounded").asInt()); // 96.000 - 28.000
        assertEquals(6, o.get("pointsEarned").asInt()); // 68.000 / 10.000 = 6 dư 8.000
        assertEquals(100 - 28 + 6, points(1));
        Map<String, Object> inv = lastInvoice();
        assertEquals(96000, ((Number) inv.get("subtotal")).intValue());
        assertEquals(0, ((Number) inv.get("promotion_discount")).intValue());
        assertEquals(28, ((Number) inv.get("points_used")).intValue());
    }

    /** Hoàn một phần: điểm hoàn = phần nguyên của (điểm đã dùng x giá trị dòng / giá trị đơn sau KM); tiền = giá trị dòng - điểm hoàn, làm tròn 500đ (BR-027). */
    @Test
    void partialRefundAllocatesPointsProportionallyAndRoundsCash() throws Exception {
        openShift();
        jdbc.update("UPDATE customer SET points = 100 WHERE customer_id = 1");
        String lines = "\"lines\":[" + line(2, 1, "M") + "," + line(1, 1, "M") + "]"; // 32.000 + 29.000 = 61.000
        JsonNode o = send(cashier, "POST", "/api/ops/takeaway", "{\"method\":\"CASH\",\"received\":100000,\"customerId\":1,\"points\":10," + lines + "}", 200);
        assertEquals(51000, o.get("rounded").asInt());
        assertEquals(5, o.get("pointsEarned").asInt());
        assertEquals(100 - 10 + 5, points(1));
        int inv = jdbc.queryForObject("SELECT invoice_id FROM invoice", Integer.class);
        int blackCoffee = o.get("lines").get(1).get("id").asInt();

        JsonNode d = send(owner, "POST", "/api/invoices/" + inv + "/lines/" + blackCoffee + "/cancel", "{\"reason\":\"Khách đổi ý\"}", 200);
        JsonNode refund = d.get("refunds").get(0);
        assertEquals(4, refund.get("pointsRefunded").asInt()); // 10 x 29.000 / 61.000 = 4,75 -> 4
        assertEquals(25000, refund.get("cashAmount").asInt()); // 29.000 - 4.000
        assertEquals(26000, jdbc.queryForObject("SELECT total - ? FROM invoice WHERE invoice_id = ?", Integer.class, 25000, inv));
    }
}
