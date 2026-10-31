package vn.vtph.coffee.menu;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vtph.coffee.common.Db;
import vn.vtph.coffee.ops.OpsException;

/**
 * UC-05 quản lý món và UC-06 quản lý topping (FR-M02-001..007). Món đã phát sinh giao dịch không xóa mà chuyển Ngừng bán (BR-007);
 * Hết hàng do Chủ quán đặt thì chỉ Chủ quán bật lại, hệ thống chỉ tự bán lại phần do hệ thống đặt (BR-006).
 */
@Service
@Profile("mysql")
@Transactional
public class MenuAdminService {
    private static final List<String> GROUPS = List.of("COFFEE", "TEA", "SMOOTHIE", "CAKE");
    private static final List<String> STATUSES = List.of("SELLING", "OUT_OF_STOCK", "STOPPED");
    private final Db db;

    private final MenuImageStore images;

    public MenuAdminService(Db db, MenuImageStore images) {
        this.db = db;
        this.images = images;
    }

    public Map<String, Object> saveImage(int id, String contentType, byte[] data) {
        item(id);
        images.save(MenuImageStore.Kind.ITEM, id, contentType, data);
        return item(id);
    }

    public Map.Entry<String, byte[]> readImage(int id) { return images.read(MenuImageStore.Kind.ITEM, id); }

    public Map<String, Object> saveToppingImage(int id, String contentType, byte[] data) {
        topping(id);
        images.save(MenuImageStore.Kind.TOPPING, id, contentType, data);
        return topping(id);
    }

    public Map.Entry<String, byte[]> readToppingImage(int id) { return images.read(MenuImageStore.Kind.TOPPING, id); }

    // ================= món =================
    @Transactional(readOnly = true)
    public List<Map<String, Object>> items() {
        List<Map<String, Object>> items = db.rows("""
                SELECT item_id AS id, name, item_group AS `group`, status, allow_hot AS allowHot, allow_cold AS allowCold FROM menu_item ORDER BY item_id""");
        Map<Integer, List<Map<String, Object>>> sizes = new LinkedHashMap<>();
        for (Map<String, Object> s : db.rows("SELECT item_id AS itemId, size, price, status, status_source AS statusSource FROM item_size ORDER BY item_id, size"))
            sizes.computeIfAbsent(((Number) s.get("itemId")).intValue(), k -> new ArrayList<>()).add(s);
        Map<Integer, List<Integer>> tops = new LinkedHashMap<>();
        for (Map<String, Object> t : db.rows("SELECT item_id, topping_id FROM menu_item_topping ORDER BY item_id, topping_id"))
            tops.computeIfAbsent(((Number) t.get("item_id")).intValue(), k -> new ArrayList<>()).add(((Number) t.get("topping_id")).intValue());
        for (Map<String, Object> m : items) {
            int id = ((Number) m.get("id")).intValue();
            m.put("allowHot", toBool(m.get("allowHot")));
            m.put("allowCold", toBool(m.get("allowCold")));
            m.put("sizes", sizes.getOrDefault(id, List.of()));
            m.put("toppingIds", tops.getOrDefault(id, List.of()));
            Long v = images.version(MenuImageStore.Kind.ITEM, id);
            m.put("imageUrl", v == null ? null : "/api/admin/items/" + id + "/image?v=" + v);
        }
        return items;
    }

    private static boolean toBool(Object o) { return o instanceof Boolean b ? b : o instanceof Number n && n.intValue() != 0; }

    private Map<String, Object> item(int id) {
        return items().stream().filter(m -> ((Number) m.get("id")).intValue() == id).findFirst()
                .orElseThrow(() -> new OpsException(404, "NO_ITEM", "Không tìm thấy món."));
    }

    private record SizeIn(String size, int price) {}

    private List<SizeIn> parseSizes(Map<String, Object> b) {
        if (!(b.get("sizes") instanceof List<?> raw) || raw.isEmpty()) throw new OpsException(422, "NO_SIZE", "Chọn ít nhất một kích thước và nhập giá bán.");
        List<SizeIn> out = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (Object o : raw) {
            if (!(o instanceof Map<?, ?> m)) continue;
            String size = String.valueOf(m.get("size"));
            if (!size.equals("M") && !size.equals("L")) throw new OpsException(422, "BAD_SIZE", "Kích thước chỉ gồm M hoặc L.");
            if (!seen.add(size)) throw new OpsException(422, "BAD_SIZE", "Kích thước " + size + " bị lặp.");
            Object p = m.get("price");
            if (!(p instanceof Number n) || n.longValue() < 0) throw new OpsException(422, "BAD_PRICE", "Giá bán không hợp lệ.");
            out.add(new SizeIn(size, n.intValue()));
        }
        return out;
    }

    private List<Integer> parseIds(Object raw) {
        List<Integer> ids = new ArrayList<>();
        if (raw instanceof List<?> l) for (Object o : l) if (o instanceof Number n) ids.add(n.intValue());
        return ids;
    }

    private void checkFlags(String group, boolean hot, boolean cold) {
        if (!hot && !cold) throw new OpsException(422, "BAD_TEMP", "Món phải bán được nóng hoặc lạnh.");
        if ("CAKE".equals(group) && (hot || !cold)) throw new OpsException(422, "BAD_TEMP", "Bánh không có tùy chọn nóng, bán cả tại quán và mang đi.");
    }

    public Map<String, Object> createItem(Map<String, Object> b) {
        String name = Db.req(b, "name", "Tên món");
        String group = Db.req(b, "group", "Nhóm món");
        if (!GROUPS.contains(group)) throw new OpsException(422, "BAD_GROUP", "Nhóm món phải là Coffee, Tea, Smoothie hoặc Cake.");
        boolean hot = Boolean.TRUE.equals(b.get("allowHot")), cold = !Boolean.FALSE.equals(b.get("allowCold"));
        checkFlags(group, hot, cold);
        List<SizeIn> sizes = parseSizes(b);
        int id = db.insertId("INSERT INTO menu_item (name, item_group, allow_hot, allow_cold) VALUES (?, ?, ?, ?)", name, group, hot, cold);
        for (SizeIn s : sizes) db.jdbc.update("INSERT INTO item_size (item_id, size, price) VALUES (?, ?, ?)", id, s.size, s.price);
        setToppings(id, parseIds(b.get("toppingIds")), group);
        return item(id);
    }

    private void setToppings(int itemId, List<Integer> ids, String group) {
        db.jdbc.update("DELETE FROM menu_item_topping WHERE item_id = ?", itemId);
        if ("CAKE".equals(group)) return; // bánh không có topping
        for (int tid : new LinkedHashSet<>(ids)) {
            if (db.jdbc.queryForList("SELECT 1 FROM topping WHERE topping_id = ?", tid).isEmpty()) throw new OpsException(422, "BAD_TOPPING", "Topping không tồn tại.");
            db.jdbc.update("INSERT INTO menu_item_topping (item_id, topping_id) VALUES (?, ?)", itemId, tid);
        }
    }

    /** Đổi giá chỉ ảnh hưởng dòng món gửi sau đó vì giá đã chốt trên order_line (BR-018). Kích thước bị bỏ: đã có giao dịch thì chuyển Ngừng bán. */
    public Map<String, Object> updateItem(int id, Map<String, Object> b) {
        Map<String, Object> cur = item(id);
        String name = Db.req(b, "name", "Tên món");
        String group = Db.req(b, "group", "Nhóm món");
        if (!GROUPS.contains(group)) throw new OpsException(422, "BAD_GROUP", "Nhóm món không hợp lệ.");
        boolean hot = Boolean.TRUE.equals(b.get("allowHot")), cold = !Boolean.FALSE.equals(b.get("allowCold"));
        checkFlags(group, hot, cold);
        List<SizeIn> sizes = parseSizes(b);
        db.jdbc.update("UPDATE menu_item SET name = ?, item_group = ?, allow_hot = ?, allow_cold = ? WHERE item_id = ?", name, group, hot, cold, id);
        Set<String> keep = new LinkedHashSet<>();
        for (SizeIn s : sizes) {
            keep.add(s.size);
            db.jdbc.update("""
                    INSERT INTO item_size (item_id, size, price) VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE price = VALUES(price)""", id, s.size, s.price);
        }
        for (Object o : (List<?>) cur.get("sizes")) {
            String size = (String) ((Map<?, ?>) o).get("size");
            if (!keep.contains(size))
                db.jdbc.update("UPDATE item_size SET status = 'STOPPED', status_source = NULL WHERE item_id = ? AND size = ?", id, size);
        }
        setToppings(id, parseIds(b.get("toppingIds")), group);
        return item(id);
    }

    /** UC-05 (ASM-22): chỉ xóa món chưa từng phát sinh giao dịch; món đã có dòng món (kể cả đã hủy) phải chuyển Ngừng bán (BR-007). */
    public void deleteItem(int id) {
        item(id);
        if (db.jdbc.queryForObject("SELECT COUNT(*) FROM order_line WHERE item_id = ?", Integer.class, id) > 0)
            throw new OpsException(409, "ITEM_HAS_HISTORY", "Món đã từng phát sinh giao dịch nên không xóa được. Hãy chuyển món sang Ngừng bán.");
        db.jdbc.update("DELETE FROM recipe_line WHERE recipe_id IN (SELECT recipe_id FROM recipe WHERE item_id = ?)", id);
        db.jdbc.update("DELETE FROM recipe WHERE item_id = ?", id);
        db.jdbc.update("DELETE FROM menu_item_topping WHERE item_id = ?", id);
        db.jdbc.update("DELETE FROM item_size WHERE item_id = ?", id);
        db.jdbc.update("DELETE FROM menu_item WHERE item_id = ?", id);
        images.delete(MenuImageStore.Kind.ITEM, id);
    }

    public Map<String, Object> setItemStatus(int id, String status) {
        item(id);
        if (!STATUSES.contains(status)) throw new OpsException(422, "BAD_STATUS", "Trạng thái không hợp lệ.");
        db.jdbc.update("UPDATE menu_item SET status = ? WHERE item_id = ?", status, id);
        return item(id);
    }

    /** Đặt trạng thái từng kích thước: Hết hàng thủ công ghi nguồn Chủ quán, bật lại về Đang bán xóa nguồn (BR-006). */
    public Map<String, Object> setSizeStatus(int id, String size, String status) {
        item(id);
        if (!STATUSES.contains(status)) throw new OpsException(422, "BAD_STATUS", "Trạng thái không hợp lệ.");
        int n = db.jdbc.update("UPDATE item_size SET status = ?, status_source = ? WHERE item_id = ? AND size = ?",
                status, "OUT_OF_STOCK".equals(status) ? "OWNER_MANAGER" : null, id, size);
        if (n == 0) throw new OpsException(404, "NO_SIZE", "Món không có kích thước này.");
        return item(id);
    }

    // ================= topping =================
    @Transactional(readOnly = true)
    public List<Map<String, Object>> toppings() {
        List<Map<String, Object>> list = db.rows("SELECT topping_id AS id, name, surcharge, status, status_source AS statusSource FROM topping ORDER BY topping_id");
        Map<Integer, List<Integer>> items = new LinkedHashMap<>();
        for (Map<String, Object> r : db.rows("SELECT topping_id, item_id FROM menu_item_topping ORDER BY topping_id, item_id"))
            items.computeIfAbsent(((Number) r.get("topping_id")).intValue(), k -> new ArrayList<>()).add(((Number) r.get("item_id")).intValue());
        for (Map<String, Object> t : list) {
            int id = ((Number) t.get("id")).intValue();
            t.put("itemIds", items.getOrDefault(id, List.of()));
            Long v = images.version(MenuImageStore.Kind.TOPPING, id);
            t.put("imageUrl", v == null ? null : "/api/admin/toppings/" + id + "/image?v=" + v);
        }
        return list;
    }

    private Map<String, Object> topping(int id) {
        return toppings().stream().filter(m -> ((Number) m.get("id")).intValue() == id).findFirst()
                .orElseThrow(() -> new OpsException(404, "NO_TOPPING", "Không tìm thấy topping."));
    }

    private int surcharge(Map<String, Object> b) {
        if (!(b.get("surcharge") instanceof Number n) || n.longValue() < 0) throw new OpsException(422, "BAD_PRICE", "Phụ phí không hợp lệ.");
        return n.intValue();
    }

    private void setToppingItems(int toppingId, List<Integer> itemIds) {
        db.jdbc.update("DELETE FROM menu_item_topping WHERE topping_id = ?", toppingId);
        for (int iid : new LinkedHashSet<>(itemIds)) {
            String group = db.one("SELECT item_group FROM menu_item WHERE item_id = ?", (rs, n) -> rs.getString(1), iid);
            if (group == null) throw new OpsException(422, "BAD_ITEM", "Món không tồn tại.");
            if ("CAKE".equals(group)) throw new OpsException(422, "BAD_ITEM", "Bánh không dùng topping.");
            db.jdbc.update("INSERT INTO menu_item_topping (item_id, topping_id) VALUES (?, ?)", iid, toppingId);
        }
    }

    public Map<String, Object> createTopping(Map<String, Object> b) {
        int id = db.insertId("INSERT INTO topping (name, surcharge) VALUES (?, ?)", Db.req(b, "name", "Tên topping"), surcharge(b));
        setToppingItems(id, parseIds(b.get("itemIds")));
        return topping(id);
    }

    public Map<String, Object> updateTopping(int id, Map<String, Object> b) {
        topping(id);
        db.jdbc.update("UPDATE topping SET name = ?, surcharge = ? WHERE topping_id = ?", Db.req(b, "name", "Tên topping"), surcharge(b), id);
        setToppingItems(id, parseIds(b.get("itemIds")));
        return topping(id);
    }

    public Map<String, Object> setToppingStatus(int id, String status) {
        topping(id);
        if (!STATUSES.contains(status)) throw new OpsException(422, "BAD_STATUS", "Trạng thái không hợp lệ.");
        db.jdbc.update("UPDATE topping SET status = ?, status_source = ? WHERE topping_id = ?", status, "OUT_OF_STOCK".equals(status) ? "OWNER_MANAGER" : null, id);
        return topping(id);
    }
}
