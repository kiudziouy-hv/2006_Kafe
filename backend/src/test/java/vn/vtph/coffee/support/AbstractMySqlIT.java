package vn.vtph.coffee.support;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import vn.vtph.coffee.common.BusinessTime;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.event.RecordApplicationEvents;

/**
 * Nền cho test chạy thật trên MySQL: Flyway dựng lược đồ Chương 5 + dữ liệu mẫu một lần, mọi lớp test dùng chung
 * container và ngữ cảnh Spring. Tự bỏ qua khi máy không có Docker (CI GitHub Actions có Docker nên vẫn chạy).
 */
@EnabledIf(value = "vn.vtph.coffee.support.MySqlContainerHolder#dockerAvailable", disabledReason = "Cần Docker để chạy MySQL bằng Testcontainers")
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@ActiveProfiles("mysql")
@TestPropertySource(properties = {"vtph.auth.legacy-demo-hash=true", "vtph.auth.require-attendance=false"})
public abstract class AbstractMySqlIT {
    private static Map<Integer, BigDecimal> stockSnapshot;
    private static List<Map<String, Object>> sizeSnapshot;

    @Autowired JdbcTemplate baseJdbc;

    /**
     * Trước mỗi test đưa danh mục về đúng dữ liệu mẫu: tồn kho, trạng thái kích thước, khuyến mãi mẫu (phụ thuộc giờ chạy nên tắt),
     * điểm thành viên và ngày kinh doanh hôm nay ở trạng thái mở. Ảnh chụp lấy lần đầu, khi CSDL còn nguyên dữ liệu mẫu.
     */
    @BeforeEach
    void restoreSeedCatalog() {
        if (stockSnapshot == null) {
            stockSnapshot = new HashMap<>();
            baseJdbc.query("SELECT ingredient_id, current_stock FROM ingredient", rs -> { stockSnapshot.put(rs.getInt(1), rs.getBigDecimal(2)); });
            sizeSnapshot = baseJdbc.queryForList("SELECT item_id, size, status, status_source FROM item_size");
            return;
        }
        stockSnapshot.forEach((id, v) -> baseJdbc.update("UPDATE ingredient SET current_stock = ? WHERE ingredient_id = ?", v, id));
        for (Map<String, Object> s : sizeSnapshot)
            baseJdbc.update("UPDATE item_size SET status = ?, status_source = ? WHERE item_id = ? AND size = ?", s.get("status"), s.get("status_source"), s.get("item_id"), s.get("size"));
        baseJdbc.update("UPDATE topping SET status = 'SELLING', status_source = NULL WHERE status = 'OUT_OF_STOCK' AND status_source = 'SYSTEM'");
        baseJdbc.update("UPDATE promotion SET active = 0");
        baseJdbc.update("UPDATE customer SET points = CASE customer_id WHEN 1 THEN 24 WHEN 2 THEN 0 ELSE 8 END WHERE customer_id <= 3");
        baseJdbc.execute((java.sql.Connection c) -> {
            try (var st = c.createStatement()) {
                st.execute("SET FOREIGN_KEY_CHECKS = 0");
                st.execute("DELETE FROM business_day");
                st.execute("SET FOREIGN_KEY_CHECKS = 1");
            }
            return null;
        });
        baseJdbc.update("INSERT INTO business_day (business_date, status) VALUES (?, 'OPEN')", BusinessTime.today());
    }

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        var c = MySqlContainerHolder.get();
        r.add("spring.datasource.url", c::getJdbcUrl);
        r.add("spring.datasource.username", c::getUsername);
        r.add("spring.datasource.password", c::getPassword);
    }
}
