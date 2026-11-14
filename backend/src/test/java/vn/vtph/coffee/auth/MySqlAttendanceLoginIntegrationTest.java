package vn.vtph.coffee.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import vn.vtph.coffee.support.AbstractMySqlIT;

/** Ràng buộc "chấm công mới được đăng nhập" chạy trên MySQL thật (các test tích hợp khác tắt ràng buộc này). */
@TestPropertySource(properties = "vtph.auth.require-attendance=true")
class MySqlAttendanceLoginIntegrationTest extends AbstractMySqlIT {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    @AfterEach
    void clean() {
        jdbc.update("DELETE FROM attendance_edit");
        jdbc.update("DELETE FROM attendance");
        jdbc.update("UPDATE account SET failed_attempts = 0, locked_until = NULL, status = 'ACTIVE'");
    }

    private ResultActions send(String url, String body) throws Exception {
        return mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions staffLogin(int accountId, String pin) throws Exception {
        return send("/api/auth/staff/login", "{\"accountId\":" + accountId + ",\"pin\":\"" + pin + "\"}");
    }

    @Test
    void staffMustCheckInBeforeLogin() throws Exception {
        // chưa ai chấm công: tài khoản quầy (9) và tài khoản cá nhân (2) đều bị chặn dù PIN đúng
        staffLogin(9, "234567").andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("NOT_CHECKED_IN"));
        staffLogin(2, "234567").andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("NOT_CHECKED_IN"));

        // thu ngân cá nhân (2) chấm công vào: chính người đó và quầy thu ngân (9) đăng nhập được
        send("/api/auth/attendance/in", "{\"accountId\":2,\"pin\":\"234567\",\"shift\":\"MORNING\"}").andExpect(status().isOk());
        staffLogin(2, "234567").andExpect(status().isOk());
        // quầy thu ngân phải kèm tên thu ngân đang chấm công; thiếu tên thì bị từ chối, người chưa chấm công cũng không vào được
        staffLogin(9, "234567").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("STAFF_REQUIRED"));
        send("/api/auth/staff/login", "{\"accountId\":9,\"pin\":\"456789\",\"staffId\":3}").andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("NOT_CHECKED_IN"));
        send("/api/auth/staff/login", "{\"accountId\":9,\"pin\":\"234567\",\"staffId\":2}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.staffName").value("Hồ Quốc Tiến"));

        // vai trò khác vẫn bị chặn: chấm công của thu ngân không mở cửa cho quầy phục vụ (11) hay phục vụ cá nhân (4)
        staffLogin(11, "123456").andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("NOT_CHECKED_IN"));
        staffLogin(4, "123456").andExpect(status().isForbidden());

        // phục vụ chấm công thì quầy phục vụ (11) đăng nhập được, cũng phải chọn tên người đang chấm công
        send("/api/auth/attendance/in", "{\"accountId\":4,\"pin\":\"123456\",\"shift\":\"MORNING\"}").andExpect(status().isOk());
        staffLogin(11, "123456").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("STAFF_REQUIRED"));
        send("/api/auth/staff/login", "{\"accountId\":11,\"pin\":\"123456\",\"staffId\":4}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.staffName").isNotEmpty());

        // chấm công ra thì không đăng nhập lại được
        send("/api/auth/attendance/out", "{\"accountId\":2,\"pin\":\"234567\"}").andExpect(status().isOk());
        send("/api/auth/staff/login", "{\"accountId\":9,\"pin\":\"234567\",\"staffId\":2}").andExpect(status().isForbidden());
    }

    @Test
    void cashierUsesOwnPinNotTheCounterPin() throws Exception {
        // dữ liệu mẫu: thu ngân 2 (Hồ Quốc Tiến) PIN 234567, thu ngân 3 (Lê Hoàng Cường) PIN 456789
        send("/api/auth/attendance/in", "{\"accountId\":3,\"pin\":\"456789\",\"shift\":\"MORNING\"}").andExpect(status().isOk());
        String as3 = "{\"accountId\":9,\"staffId\":3,\"pin\":\"";
        send("/api/auth/staff/login", as3 + "234567\"}").andExpect(status().isUnauthorized()); // PIN của người kia hay PIN chung của quầy đều không vào được
        send("/api/auth/staff/login", as3 + "456789\"}").andExpect(status().isOk()).andExpect(jsonPath("$.staffName").value("Lê Hoàng Cường"));
        // PIN của người này không mở được tên người khác
        send("/api/auth/staff/login", "{\"accountId\":9,\"staffId\":2,\"pin\":\"456789\"}").andExpect(status().isUnauthorized());
    }

    @Test
    void ownerLogsInWithoutAttendance() throws Exception {
        String user = jdbc.queryForObject("SELECT username FROM account WHERE role = 'OWNER_MANAGER' LIMIT 1", String.class);
        assertEquals("owner", user);
        send("/api/auth/owner/login", "{\"username\":\"owner\",\"password\":\"admin123\"}").andExpect(status().isOk());
    }

    /** Lỗi cũ: @Transactional ở AttendanceService rollback bộ đếm sai nên chấm công cho dò PIN vô hạn. */
    @Test
    void wrongPinOnAttendanceCountsAndLocksAfterFiveAttempts() throws Exception {
        String wrong = "{\"accountId\":3,\"pin\":\"000000\",\"shift\":\"MORNING\"}";
        for (int left = 4; left >= 1; left--)
            send("/api/auth/attendance/in", wrong).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("WRONG_SECRET")).andExpect(jsonPath("$.attemptsLeft").value(left));
        assertEquals(4, jdbc.queryForObject("SELECT failed_attempts FROM account WHERE account_id = 3", Integer.class));

        // lần sai thứ 5: khóa tạm 15 phút
        send("/api/auth/attendance/in", wrong).andExpect(status().isLocked())
                .andExpect(jsonPath("$.code").value("LOCKED")).andExpect(jsonPath("$.lockSeconds").value(900));
        assertEquals(5, jdbc.queryForObject("SELECT failed_attempts FROM account WHERE account_id = 3", Integer.class));
        assertEquals("TEMP_LOCKED", jdbc.queryForObject("SELECT status FROM account WHERE account_id = 3", String.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM account WHERE account_id = 3 AND locked_until IS NOT NULL", Integer.class));

        // đang khóa thì PIN đúng cũng bị từ chối, cả ở chấm công vào, chấm công ra lẫn đăng nhập; không phát sinh bản ghi chấm công
        send("/api/auth/attendance/in", "{\"accountId\":3,\"pin\":\"456789\",\"shift\":\"MORNING\"}").andExpect(status().isLocked());
        send("/api/auth/attendance/out", "{\"accountId\":3,\"pin\":\"456789\"}").andExpect(status().isLocked());
        staffLogin(3, "456789").andExpect(status().isLocked());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM attendance", Integer.class));
    }

    @Test
    void successfulCheckInResetsWrongPinCounter() throws Exception {
        send("/api/auth/attendance/in", "{\"accountId\":3,\"pin\":\"000000\",\"shift\":\"MORNING\"}").andExpect(status().isUnauthorized());
        assertEquals(1, jdbc.queryForObject("SELECT failed_attempts FROM account WHERE account_id = 3", Integer.class));
        send("/api/auth/attendance/in", "{\"accountId\":3,\"pin\":\"456789\",\"shift\":\"MORNING\"}").andExpect(status().isOk());
        assertEquals(0, jdbc.queryForObject("SELECT failed_attempts FROM account WHERE account_id = 3", Integer.class));
    }
}
