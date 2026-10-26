package vn.vtph.coffee.web;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Kiểm tra kết nối cơ sở dữ liệu và đọc thử thực đơn (bước thử nghiệm ban đầu).
 * Không có DataSource (chế độ mặc định, dữ liệu giả lập trong bộ nhớ) thì báo mode "mock" thay vì lỗi.
 */
@RestController
@RequestMapping("/api")
public class HealthController {
    private final ObjectProvider<JdbcTemplate> jdbcProvider;

    public HealthController(ObjectProvider<JdbcTemplate> jdbcProvider) {
        this.jdbcProvider = jdbcProvider;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> r = new LinkedHashMap<>();
        JdbcTemplate jdbc = jdbcProvider.getIfAvailable();
        if (jdbc == null) {
            r.put("mode", "mock");
            r.put("database", null);
            return r;
        }
        r.put("mode", "mysql");
        r.put("database", jdbc.queryForObject("SELECT DATABASE()", String.class));
        r.put("mysqlVersion", jdbc.queryForObject("SELECT VERSION()", String.class));
        r.put("tables", jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'",
                Integer.class));
        return r;
    }

    @GetMapping("/menu")
    public ResponseEntity<?> menu() {
        JdbcTemplate jdbc = jdbcProvider.getIfAvailable();
        if (jdbc == null) {
            return ResponseEntity.status(503).body(Map.of("code", "NO_DATABASE",
                    "message", "Đang chạy chế độ giả lập, chưa nối cơ sở dữ liệu. Dùng /api/ops/menu."));
        }
        return ResponseEntity.ok(jdbc.queryForList(
                "SELECT m.item_id AS id, m.name, m.item_group AS grp, m.status, MIN(s.price) AS fromPrice "
                        + "FROM menu_item m JOIN item_size s ON s.item_id = m.item_id "
                        + "GROUP BY m.item_id, m.name, m.item_group, m.status ORDER BY m.item_id"));
    }
}
