package vn.vtph.coffee.staff;

import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import vn.vtph.coffee.common.Access;
import vn.vtph.coffee.common.Db;

/**
 * Chấm công. Hai API chấm công vào/ra nằm dưới /api/auth/attendance (được phép khi chưa đăng nhập vì dùng PIN tại máy quầy);
 * xem và chỉnh sửa nằm dưới /api/attendance, chỉ Chủ quán/Quản lý (BR-039).
 */
@RestController
@Profile("mysql")
public class AttendanceController {
    private final AttendanceService svc;
    private final Access access;

    public AttendanceController(AttendanceService svc, Access access) { this.svc = svc; this.access = access; }

    @PostMapping("/api/auth/attendance/in")
    public Map<String, Object> in(@RequestBody Map<String, Object> b) {
        return svc.checkIn(Db.reqInt(b, "accountId", "Tài khoản"), String.valueOf(b.getOrDefault("pin", "")), String.valueOf(b.get("shift")), Db.str(b, "role"));
    }

    @PostMapping("/api/auth/attendance/out")
    public Map<String, Object> out(@RequestBody Map<String, Object> b) {
        return svc.checkOut(Db.reqInt(b, "accountId", "Tài khoản"), String.valueOf(b.getOrDefault("pin", "")), Db.str(b, "role"));
    }

    @GetMapping("/api/attendance")
    public List<Map<String, Object>> list(@RequestParam(required = false) String from, @RequestParam(required = false) String to,
                                          @RequestParam(required = false) Integer employeeId, HttpSession s) {
        access.who(s);
        return svc.list(from == null ? null : LocalDate.parse(from), to == null ? null : LocalDate.parse(to), employeeId);
    }

    @GetMapping("/api/attendance/{id}/history")
    public List<Map<String, Object>> history(@PathVariable int id, HttpSession s) { access.who(s); return svc.history(id); }

    @PutMapping("/api/attendance/{id}")
    public Map<String, Object> edit(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) { return svc.edit(id, b, access.who(s)); }

    @PostMapping("/api/attendance")
    public Map<String, Object> add(@RequestBody Map<String, Object> b, HttpSession s) { return svc.add(b, access.who(s)); }
}
