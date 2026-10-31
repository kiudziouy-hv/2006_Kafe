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
        staffLogin(9, "234567").andExpect(status().isOk());

        // vai trò khác vẫn bị chặn: chấm công của thu ngân không mở cửa cho quầy phục vụ (11) hay phục vụ cá nhân (4)
        staffLogin(11, "123456").andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("NOT_CHECKED_IN"));
        staffLogin(4, "123456").andExpect(status().isForbidden());

        // chấm công ra thì không đăng nhập lại được
        send("/api/auth/attendance/out", "{\"accountId\":2,\"pin\":\"234567\"}").andExpect(status().isOk());
        staffLogin(9, "234567").andExpect(status().isForbidden());
    }

    @Test
    void ownerLogsInWithoutAttendance() throws Exception {
        String user = jdbc.queryForObject("SELECT username FROM account WHERE role = 'OWNER_MANAGER' LIMIT 1", String.class);
        assertEquals("owner", user);
        send("/api/auth/owner/login", "{\"username\":\"owner\",\"password\":\"admin123\"}").andExpect(status().isOk());
    }
}
