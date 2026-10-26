package vn.vtph.coffee.table;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Sơ đồ 14 bàn (FR-M03-001): 8 trong nhà, 6 ngoài trời. */
@RestController
@RequestMapping("/api/tables")
public class TableController {

    private final JdbcTemplate jdbc;

    public TableController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<DiningTableView> list() {
        return jdbc.query(
                "SELECT table_id, `number`, area, status FROM dining_table ORDER BY `number`",
                (rs, i) -> new DiningTableView(
                        rs.getLong("table_id"), rs.getInt("number"), rs.getString("area"), rs.getString("status")));
    }
}
