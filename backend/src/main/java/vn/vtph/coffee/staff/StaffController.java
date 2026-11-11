package vn.vtph.coffee.staff;

import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.auth.Role;
import vn.vtph.coffee.common.Access;

/** API nhân sự: hồ sơ cá nhân (mọi vai trò) và quản lý nhân viên (chỉ Chủ quán/Quản lý). */
@RestController
@RequestMapping("/api/staff")
@Profile("mysql")
public class StaffController {
    private final StaffService staff;
    private final Access access;

    public StaffController(StaffService staff, Access access) { this.staff = staff; this.access = access; }

    @GetMapping("/me") public Map<String, Object> me(HttpSession s) {
        return staff.me(access.who(s, Role.WAITER, Role.CASHIER, Role.BARISTA)); }

    @PutMapping("/me") public Map<String, Object> updateMe(@RequestBody Map<String, Object> b, HttpSession s) {
        return staff.updateMe(access.who(s, Role.WAITER, Role.CASHIER, Role.BARISTA), b); }

    @GetMapping public List<Map<String, Object>> list(HttpSession s) { access.who(s); return staff.list(); }

    @PostMapping public Map<String, Object> create(@RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return staff.create(b); }

    @PutMapping("/{id}") public Map<String, Object> update(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) {
        access.who(s); return staff.update(id, b); }

    @PostMapping("/{id}/lock") public Map<String, Object> lock(@PathVariable int id, HttpSession s) {
        Account a = access.who(s); return staff.setLocked(id, true, a); }

    @PostMapping("/{id}/unlock") public Map<String, Object> unlock(@PathVariable int id, HttpSession s) {
        Account a = access.who(s); return staff.setLocked(id, false, a); }

    @PostMapping("/{id}/secret") public Map<String, Object> secret(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) {
        access.who(s); return staff.resetSecret(id, b.get("secret") == null ? null : String.valueOf(b.get("secret"))); }
}
