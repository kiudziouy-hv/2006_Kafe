package vn.vtph.coffee.inventory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.common.Db;
import vn.vtph.coffee.ops.OpsException;

/**
 * Kho nguyên liệu (M06): UC-16 nguyên liệu, UC-17 công thức, UC-18 nhập kho, UC-19 điều chỉnh tồn,
 * UC-20 hao hụt (pha chế đề xuất, Chủ quán xác nhận, BR-016), UC-21 cảnh báo tồn thấp và sắp hết hạn.
 */
@Service
@Profile("mysql")
@Transactional
public class InventoryService {
    private final Db db;

    public InventoryService(Db db) { this.db = db; }

    private static BigDecimal nonNegative(Map<String, Object> b, String key, String label) {
        BigDecimal v = Db.decimal(b, key, label);
        if (v.signum() < 0) throw new OpsException(422, "BAD_NUMBER", label + " không được âm.");
        return v;
    }

    private static BigDecimal positive(Map<String, Object> b, String key, String label) {
        BigDecimal v = Db.decimal(b, key, label);
        if (v.signum() <= 0) throw new OpsException(422, "BAD_NUMBER", label + " phải lớn hơn 0.");
        return v;
    }

    // ================= UC-16 nguyên liệu =================
    @Transactional(readOnly = true)
    public List<Map<String, Object>> ingredients() {
        return db.rows("""
                SELECT i.ingredient_id AS id, i.name, i.unit, i.min_stock AS minStock, i.current_stock AS currentStock,
                       i.track_expiry AS trackExpiry, v.available_stock AS availableStock, i.current_stock < i.min_stock AS low
                FROM ingredient i JOIN v_available_stock v ON v.ingredient_id = i.ingredient_id ORDER BY i.ingredient_id""");
    }

    private Map<String, Object> ingredient(int id) {
        return db.rowOr404("""
                SELECT i.ingredient_id AS id, i.name, i.unit, i.min_stock AS minStock, i.current_stock AS currentStock,
                       i.track_expiry AS trackExpiry, v.available_stock AS availableStock, i.current_stock < i.min_stock AS low
                FROM ingredient i JOIN v_available_stock v ON v.ingredient_id = i.ingredient_id WHERE i.ingredient_id = ?""",
                "NO_INGREDIENT", "Không tìm thấy nguyên liệu.", id);
    }

    public Map<String, Object> createIngredient(Map<String, Object> b) {
        int id = db.insertId("INSERT INTO ingredient (name, unit, min_stock, track_expiry) VALUES (?, ?, ?, ?)",
                Db.req(b, "name", "Tên nguyên liệu"), Db.req(b, "unit", "Đơn vị tính"), nonNegative(b, "minStock", "Mức tồn tối thiểu"),
                Boolean.TRUE.equals(b.get("trackExpiry")));
        return ingredient(id);
    }

    public Map<String, Object> updateIngredient(int id, Map<String, Object> b) {
        ingredient(id);
        db.jdbc.update("UPDATE ingredient SET name = ?, unit = ?, min_stock = ?, track_expiry = ? WHERE ingredient_id = ?",
                Db.req(b, "name", "Tên nguyên liệu"), Db.req(b, "unit", "Đơn vị tính"), nonNegative(b, "minStock", "Mức tồn tối thiểu"),
                Boolean.TRUE.equals(b.get("trackExpiry")), id);
        return ingredient(id);
    }

    // ================= UC-17 công thức =================
    /** Mỗi kích thước món và mỗi topping có tối đa một công thức; liệt kê cả đối tượng chưa có công thức. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> recipeTargets() {
        List<Map<String, Object>> out = new ArrayList<>();
        out.addAll(db.rows("""
                SELECT 'ITEM' AS kind, s.item_id AS itemId, s.size, NULL AS toppingId, CONCAT(m.name, ' (', s.size, ')') AS name,
                       (SELECT COUNT(*) FROM recipe r JOIN recipe_line rl ON rl.recipe_id = r.recipe_id WHERE r.item_id = s.item_id AND r.size = s.size) AS lineCount
                FROM item_size s JOIN menu_item m ON m.item_id = s.item_id ORDER BY m.item_id, s.size"""));
        out.addAll(db.rows("""
                SELECT 'TOPPING' AS kind, NULL AS itemId, NULL AS size, t.topping_id AS toppingId, CONCAT('Topping: ', t.name) AS name,
                       (SELECT COUNT(*) FROM recipe r JOIN recipe_line rl ON rl.recipe_id = r.recipe_id WHERE r.topping_id = t.topping_id) AS lineCount
                FROM topping t ORDER BY t.topping_id"""));
        return out;
    }

    private Integer recipeId(Integer itemId, String size, Integer toppingId) {
        if (toppingId != null)
            return db.one("SELECT recipe_id FROM recipe WHERE topping_id = ?", (rs, n) -> rs.getInt(1), toppingId);
        return db.one("SELECT recipe_id FROM recipe WHERE item_id = ? AND size = ?", (rs, n) -> rs.getInt(1), itemId, size);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> recipe(Integer itemId, String size, Integer toppingId) {
        Integer rid = recipeId(itemId, size, toppingId);
        if (rid == null) return List.of();
        return db.rows("""
                SELECT rl.ingredient_id AS ingredientId, i.name, i.unit, rl.quantity FROM recipe_line rl
                JOIN ingredient i ON i.ingredient_id = rl.ingredient_id WHERE rl.recipe_id = ? ORDER BY rl.ingredient_id""", rid);
    }

    public List<Map<String, Object>> saveRecipe(Map<String, Object> b) {
        Integer itemId = Db.integer(b, "itemId"), toppingId = Db.integer(b, "toppingId");
        String size = Db.str(b, "size");
        if ((toppingId == null) == (itemId == null)) throw new OpsException(422, "BAD_TARGET", "Chọn một kích thước món hoặc một topping.");
        if (itemId != null && (size == null || db.jdbc.queryForList("SELECT 1 FROM item_size WHERE item_id = ? AND size = ?", itemId, size).isEmpty()))
            throw new OpsException(404, "NO_SIZE", "Không tìm thấy kích thước món.");
        if (toppingId != null && db.jdbc.queryForList("SELECT 1 FROM topping WHERE topping_id = ?", toppingId).isEmpty())
            throw new OpsException(404, "NO_TOPPING", "Không tìm thấy topping.");
        if (!(b.get("lines") instanceof List<?> raw) || raw.isEmpty()) throw new OpsException(422, "NO_LINES", "Công thức cần ít nhất một nguyên liệu.");
        Set<Integer> seen = new TreeSet<>();
        List<Object[]> lines = new ArrayList<>();
        for (Object o : raw) {
            if (!(o instanceof Map<?, ?> m)) continue;
            @SuppressWarnings("unchecked") Map<String, Object> line = (Map<String, Object>) m;
            int ing = Db.reqInt(line, "ingredientId", "Nguyên liệu");
            if (!seen.add(ing)) throw new OpsException(422, "DUPLICATE_LINE", "Mỗi nguyên liệu chỉ xuất hiện một lần trong công thức.");
            if (db.jdbc.queryForList("SELECT 1 FROM ingredient WHERE ingredient_id = ?", ing).isEmpty()) throw new OpsException(422, "NO_INGREDIENT", "Nguyên liệu không có trong danh mục.");
            lines.add(new Object[]{ing, positive(line, "quantity", "Lượng dùng")});
        }
        Integer rid = recipeId(itemId, size, toppingId);
        if (rid == null) rid = toppingId != null
                ? db.insertId("INSERT INTO recipe (topping_id) VALUES (?)", toppingId)
                : db.insertId("INSERT INTO recipe (item_id, size) VALUES (?, ?)", itemId, size);
        db.jdbc.update("DELETE FROM recipe_line WHERE recipe_id = ?", rid);
        for (Object[] l : lines) db.jdbc.update("INSERT INTO recipe_line (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)", rid, l[0], l[1]);
        return recipe(itemId, size, toppingId);
    }

    // ================= UC-18 nhập kho =================
    /** Tự bán lại kích thước/topping đang Hết hàng do hệ thống khi mọi nguyên liệu đã đủ (FR-M02-006, BR-006). */
    private int resell() {
        int n = db.jdbc.update("""
                UPDATE item_size s SET s.status = 'SELLING', s.status_source = NULL
                WHERE s.status = 'OUT_OF_STOCK' AND s.status_source = 'SYSTEM' AND NOT EXISTS (
                  SELECT 1 FROM recipe r JOIN recipe_line rl ON rl.recipe_id = r.recipe_id JOIN ingredient i ON i.ingredient_id = rl.ingredient_id
                  WHERE r.item_id = s.item_id AND r.size = s.size AND rl.quantity > i.current_stock)""");
        n += db.jdbc.update("""
                UPDATE topping t SET t.status = 'SELLING', t.status_source = NULL
                WHERE t.status = 'OUT_OF_STOCK' AND t.status_source = 'SYSTEM' AND NOT EXISTS (
                  SELECT 1 FROM recipe r JOIN recipe_line rl ON rl.recipe_id = r.recipe_id JOIN ingredient i ON i.ingredient_id = rl.ingredient_id
                  WHERE r.topping_id = t.topping_id AND rl.quantity > i.current_stock)""");
        return n;
    }

    public Map<String, Object> receive(Map<String, Object> b) {
        if (!(b.get("lines") instanceof List<?> raw) || raw.isEmpty()) throw new OpsException(422, "NO_LINES", "Phiếu nhập chưa có nguyên liệu nào.");
        List<Map<String, Object>> done = new ArrayList<>();
        for (Object o : raw) {
            if (!(o instanceof Map<?, ?> m)) continue;
            @SuppressWarnings("unchecked") Map<String, Object> line = (Map<String, Object>) m;
            int ing = Db.reqInt(line, "ingredientId", "Nguyên liệu");
            Map<String, Object> cur = ingredient(ing);
            BigDecimal qty = positive(line, "quantity", "Số lượng nhập");
            String exp = Db.str(line, "expiryDate");
            LocalDate expiry = null;
            if (toBool(cur.get("trackExpiry"))) {
                if (exp == null || exp.isEmpty()) throw new OpsException(422, "EXPIRY_REQUIRED", cur.get("name") + " bắt buộc nhập hạn sử dụng.");
                try { expiry = LocalDate.parse(exp); } catch (Exception e) { throw new OpsException(422, "BAD_DATE", "Hạn sử dụng không hợp lệ."); }
                if (expiry.isBefore(db.today())) throw new OpsException(422, "EXPIRED", cur.get("name") + ": hạn sử dụng đã qua.");
            }
            db.jdbc.update("INSERT INTO stock_receipt (ingredient_id, quantity, received_at, expiry_date) VALUES (?, ?, ?, ?)", ing, qty, Db.nowUtc(), expiry);
            db.jdbc.update("UPDATE ingredient SET current_stock = current_stock + ? WHERE ingredient_id = ?", qty, ing);
            done.add(ingredient(ing));
        }
        int back = resell();
        return Map.of("ingredients", done, "resold", back);
    }

    private static boolean toBool(Object o) { return o instanceof Boolean x ? x : o instanceof Number n && n.intValue() != 0; }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> receipts() {
        return db.rows("""
                SELECT r.receipt_id AS id, i.name AS ingredient, i.unit, r.quantity, r.received_at AS receivedAt, r.expiry_date AS expiryDate
                FROM stock_receipt r JOIN ingredient i ON i.ingredient_id = r.ingredient_id ORDER BY r.received_at DESC, r.receipt_id DESC LIMIT 100""");
    }

    // ================= UC-19 điều chỉnh tồn kho =================
    public Map<String, Object> adjust(Map<String, Object> b, Account by) {
        int ing = Db.reqInt(b, "ingredientId", "Nguyên liệu");
        BigDecimal actual = nonNegative(b, "actual", "Số lượng kiểm kê");
        String reason = Db.req(b, "reason", "Lý do điều chỉnh");
        BigDecimal before = db.one("SELECT current_stock FROM ingredient WHERE ingredient_id = ? FOR UPDATE", (rs, n) -> rs.getBigDecimal(1), ing);
        if (before == null) throw new OpsException(404, "NO_INGREDIENT", "Không tìm thấy nguyên liệu.");
        if (before.compareTo(actual) == 0) throw new OpsException(422, "NO_DIFF", "Số kiểm kê trùng với tồn kho, không cần điều chỉnh.");
        db.jdbc.update("UPDATE ingredient SET current_stock = ? WHERE ingredient_id = ?", actual, ing);
        db.jdbc.update("INSERT INTO stock_adjustment (ingredient_id, quantity_before, quantity_after, reason, adjusted_at, adjusted_by) VALUES (?, ?, ?, ?, ?, ?)",
                ing, before, actual, reason, Db.nowUtc(), db.employeeId(by));
        resell();
        return ingredient(ing);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> adjustments() {
        return db.rows("""
                SELECT a.adjustment_id AS id, i.name AS ingredient, i.unit, a.quantity_before AS quantityBefore, a.quantity_after AS quantityAfter,
                       a.reason, a.adjusted_at AS adjustedAt, e.full_name AS adjustedBy
                FROM stock_adjustment a JOIN ingredient i ON i.ingredient_id = a.ingredient_id JOIN employee e ON e.employee_id = a.adjusted_by
                ORDER BY a.adjusted_at DESC, a.adjustment_id DESC LIMIT 100""");
    }

    // ================= UC-20 hao hụt =================
    public Map<String, Object> proposeWaste(Map<String, Object> b, Account by) {
        int ing = Db.reqInt(b, "ingredientId", "Nguyên liệu");
        ingredient(ing);
        int id = db.insertId("INSERT INTO waste_record (ingredient_id, quantity, reason, created_at, created_by) VALUES (?, ?, ?, ?, ?)",
                ing, positive(b, "quantity", "Số lượng hao hụt"), Db.req(b, "reason", "Lý do hao hụt"), Db.nowUtc(), db.employeeId(by));
        return waste(id);
    }

    private static final String WASTE_SQL = """
            SELECT w.waste_id AS id, w.ingredient_id AS ingredientId, i.name AS ingredient, i.unit, w.quantity, w.reason, w.status,
                   w.created_at AS createdAt, c.full_name AS createdBy, w.confirmed_at AS confirmedAt, f.full_name AS confirmedBy
            FROM waste_record w JOIN ingredient i ON i.ingredient_id = w.ingredient_id JOIN employee c ON c.employee_id = w.created_by
            LEFT JOIN employee f ON f.employee_id = w.confirmed_by""";

    private Map<String, Object> waste(int id) {
        return db.rowOr404(WASTE_SQL + " WHERE w.waste_id = ?", "NO_WASTE", "Không tìm thấy phiếu hao hụt.", id);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> wasteList(String status) {
        return status == null ? db.rows(WASTE_SQL + " ORDER BY w.waste_id DESC LIMIT 100")
                : db.rows(WASTE_SQL + " WHERE w.status = ? ORDER BY w.waste_id DESC LIMIT 100", status);
    }

    /** Xác nhận: trừ tồn theo phiếu, không cho tồn âm (BR-011); từ chối thì chỉ đổi trạng thái. */
    public Map<String, Object> decideWaste(int id, boolean confirm, Account by) {
        Map<String, Object> w = db.row(WASTE_SQL + " WHERE w.waste_id = ? FOR UPDATE", id);
        if (w == null) throw new OpsException(404, "NO_WASTE", "Không tìm thấy phiếu hao hụt.");
        if (!"PROPOSED".equals(w.get("status"))) throw new OpsException(409, "NOT_PROPOSED", "Phiếu này đã được xử lý.");
        if (confirm) {
            int ok = db.jdbc.update("UPDATE ingredient SET current_stock = current_stock - ? WHERE ingredient_id = ? AND current_stock >= ?",
                    w.get("quantity"), w.get("ingredientId"), w.get("quantity"));
            if (ok == 0) throw new OpsException(409, "NOT_ENOUGH_STOCK", "Tồn kho hiện tại không đủ để trừ " + w.get("quantity") + " " + w.get("unit") + " " + w.get("ingredient") + ".");
        }
        db.jdbc.update("UPDATE waste_record SET status = ?, confirmed_at = ?, confirmed_by = ? WHERE waste_id = ?",
                confirm ? "CONFIRMED" : "REJECTED", Db.nowUtc(), db.employeeId(by), id);
        return waste(id);
    }

    // ================= UC-21 cảnh báo =================
    @Transactional(readOnly = true)
    public Map<String, Object> alerts() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("lowStock", db.rows("SELECT ingredient_id AS id, name, unit, current_stock AS currentStock, min_stock AS minStock FROM v_low_stock ORDER BY name"));
        m.put("expiring", db.rows("""
                SELECT receipt_id AS id, ingredient, expiry_date AS expiryDate, days_left AS daysLeft, quantity_to_check AS quantityToCheck
                FROM v_expiry_warning ORDER BY expiry_date, receipt_id"""));
        return m;
    }
}
