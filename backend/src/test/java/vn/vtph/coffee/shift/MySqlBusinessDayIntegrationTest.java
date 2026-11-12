package vn.vtph.coffee.shift;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.vtph.coffee.common.BusinessTime;
import vn.vtph.coffee.common.Db;
import vn.vtph.coffee.support.AbstractMySqlIT;

/** Ngày kinh doanh ở Java và ở dữ liệu mẫu SQL phải cùng một ngày theo giờ Việt Nam (container MySQL chạy UTC). */
class MySqlBusinessDayIntegrationTest extends AbstractMySqlIT {
    @Autowired Db db;
    @Autowired JdbcTemplate jdbc;
    @Autowired DayService days;

    @Test
    void dbTodayIsBusinessTimeToday() {
        LocalDate before = BusinessTime.today(), got = db.today(), after = BusinessTime.today();
        assertTrue(got.equals(before) || got.equals(after));
    }

    /** Biểu thức dùng trong dữ liệu mẫu (database/03, 05) thay cho CURDATE() vốn theo múi giờ của máy chủ MySQL. */
    @Test
    void seedDateExpressionMatchesVietnamDate() {
        LocalDate before = BusinessTime.today();
        LocalDate sql = jdbc.queryForObject("SELECT DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR)", LocalDate.class);
        LocalDate after = BusinessTime.today();
        assertTrue(sql.equals(before) || sql.equals(after), "SQL " + sql + " lệch Java " + before);
    }

    @Test
    void dayStateReportsVietnamDate() {
        LocalDate before = BusinessTime.today();
        Object date = days.state().get("date");
        LocalDate after = BusinessTime.today();
        assertTrue(date.equals(before.toString()) || date.equals(after.toString()), "ngày trạng thái " + date);
    }
}
