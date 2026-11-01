package vn.vtph.coffee.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** API đăng nhập, đăng xuất và phiên làm việc (UC-01, UC-02). Phiên lưu bằng cookie của máy chủ. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    static final String SESSION_KEY = "accountId";
    /** Nhân viên (mã) chọn lúc đăng nhập tài khoản quầy thu ngân/phục vụ; đơn và hóa đơn ghi theo người này. */
    public static final String STAFF_KEY = "staffId";
    static final String STAFF_NAME_KEY = "staffName";
    private final AuthService auth;
    private final HttpSessionSecurityContextRepository contexts = new HttpSessionSecurityContextRepository();

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @GetMapping("/staff")
    public List<Map<String, Object>> staff() {
        return auth.staffList();
    }

    /** Nhân viên đang chấm công của vai trò (CASHIER hoặc WAITER) để chọn tên lúc đăng nhập. */
    @GetMapping("/on-duty")
    public List<Map<String, Object>> onDuty(@RequestParam String role) {
        Role r = "CASHIER".equals(role) ? Role.CASHIER : "WAITER".equals(role) ? Role.WAITER : null;
        return r == null ? List.of() : auth.onDutyStaff(r);
    }

    @PostMapping("/staff/login")
    public Map<String, Object> staffLogin(@RequestBody Map<String, Object> body, HttpServletRequest req, HttpServletResponse res) {
        Object id = body.get("accountId");
        int accountId = id instanceof Number n ? n.intValue() : -1;
        AuthService.StaffLogin login = auth.loginStaff(accountId, String.valueOf(body.getOrDefault("pin", "")),
                body.get("staffId") instanceof Number n ? n.intValue() : null);
        return start(login.account(), req, res, login.picked());
    }

    @PostMapping("/owner/login")
    public Map<String, Object> ownerLogin(@RequestBody Map<String, Object> body, HttpServletRequest req, HttpServletResponse res) {
        Account a = auth.loginOwner(str(body.get("username")), str(body.get("password")));
        return start(a, req, res, null);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpSession session) {
        SecurityContextHolder.clearContext();
        session.invalidate();
        return Map.of("ok", true);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(HttpSession session) {
        Object id = session.getAttribute(SESSION_KEY);
        Account a = id instanceof Integer i ? auth.find(i) : null;
        if (a != null && a.permanentlyLocked) { session.invalidate(); a = null; }
        if (a == null) return ResponseEntity.status(401).body(Map.of("code", "NO_SESSION", "message", "Chưa đăng nhập hoặc phiên đã hết hạn."));
        return ResponseEntity.ok(view(a, (String) session.getAttribute(STAFF_NAME_KEY)));
    }

    private Map<String, Object> start(Account a, HttpServletRequest req, HttpServletResponse res, Map<String, Object> picked) {
        HttpSession session = req.getSession(true);
        if (!session.isNew()) req.changeSessionId(); // đổi mã phiên sau khi đăng nhập (chống cố định phiên)
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                a.username, null, java.util.List.of(new SimpleGrantedAuthority("ROLE_" + a.role.name()))));
        SecurityContextHolder.setContext(ctx);
        contexts.saveContext(ctx, req, res);
        session.setAttribute(SESSION_KEY, a.id);
        session.setAttribute(STAFF_KEY, picked == null ? null : picked.get("id"));
        session.setAttribute(STAFF_NAME_KEY, picked == null ? null : picked.get("name"));
        // Thu ngân và màn hình pha chế: hết phiên sau 5 phút không gọi API (UC-02, ASM-14).
        session.setMaxInactiveInterval(a.role.autoLogout() ? 300 : 8 * 3600);
        return view(a, picked == null ? null : (String) picked.get("name"));
    }

    private Map<String, Object> view(Account a, String cashierName) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.id);
        m.put("fullName", a.fullName);
        m.put("role", a.role.name());
        m.put("staffName", cashierName);
        m.put("home", a.role.homeScreen());
        m.put("autoLogoutSeconds", a.role.autoLogout() ? 300 : 0);
        return m;
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<Map<String, Object>> onAuth(AuthException e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("code", e.code);
        m.put("message", e.getMessage());
        m.put("attemptsLeft", e.attemptsLeft);
        m.put("lockSeconds", e.lockSeconds);
        return ResponseEntity.status(e.status).body(m);
    }
}
