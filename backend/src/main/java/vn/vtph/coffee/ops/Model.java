package vn.vtph.coffee.ops;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Các lớp dữ liệu trong bộ nhớ (Jackson tự chuyển các trường public thành JSON). */
public class Model {
    public static class Size { public String code, label; public int price;
        public Size(String c, String l, int p) { code = c; label = l; price = p; } }

    public static class MenuItem {
        public int id; public String name, group; public String status = "ACTIVE"; // ACTIVE | OUT_OF_STOCK | DISCONTINUED
        public boolean hotOnly, coldOnly, cake;
        public List<Size> sizes = new ArrayList<>();
        public Map<String, Integer> recipe = new LinkedHashMap<>();   // nguyên liệu -> lượng cho 1 ly
        public boolean takeaway() { return cake || coldOnly || (!hotOnly && !cake); }
    }

    public static class Topping { public int id; public String name; public int price; public String status = "ACTIVE";
        public String ingredient; public int amount;
        public Topping(int id, String n, int p, String ing, int a) { this.id = id; name = n; price = p; ingredient = ing; amount = a; } }

    public static class Ingredient { public String id, name, unit; public int stock, min;
        public Ingredient(String id, String n, String u, int s, int m) { this.id = id; name = n; unit = u; stock = s; min = m; } }

    public static class Line {
        public int id; public int itemId; public String name, size, temp, sugar, ice, status = "NEW"; // NEW | MAKING | DONE | CANCELLED
        public List<String> toppings = new ArrayList<>(); public List<Integer> toppingIds = new ArrayList<>();
        public int qty, unitPrice, discountPercent; public String cancelReason; public Instant sentAt = Instant.now();
        public boolean cake; public String tableLabel; public int orderId;
        public int total() { return unitPrice * qty; }
    }

    public static class Order {
        public int id; public String type; // DINE | TAKEAWAY
        public Integer tableNo; public Integer seq; public String status = "OPEN"; // OPEN | DRAFT | PAID | CANCELLED
        public boolean waitingPay; public String payMethod; public Integer received, change, shiftId; public String invoiceNo, createdBy;
        public Instant createdAt = Instant.now(), paidAt; public int total, rounded;
        /** Giảm giá khuyến mãi, tiền sau khuyến mãi, điểm đã dùng/tích và số điểm tối đa dùng được (BR-020, BR-021, BR-023). */
        public int discount, afterPromo, pointsUsed, pointsEarned, maxPoints; public String customerName;
        public List<Line> lines = new ArrayList<>();
    }

    public static class Shift { public int id; public String type; public int openingCash; public Integer actualCash, expectedCash, diff;
        public Instant openedAt = Instant.now(), closedAt; public boolean open = true; public String openedBy; }
}
