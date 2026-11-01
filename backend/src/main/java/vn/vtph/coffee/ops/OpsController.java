package vn.vtph.coffee.ops;

import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.common.Db;
import vn.vtph.coffee.auth.AuthController;
import vn.vtph.coffee.auth.AuthService;
import vn.vtph.coffee.auth.Role;

/** API gọi món, pha chế, ca và thanh toán. Mọi API kiểm tra phiên và vai trò (NFR-011). */
@RestController
@RequestMapping("/api/ops")
public class OpsController {
    private final OpsService ops;
    private final AuthService auth;

    public OpsController(OpsService ops, AuthService auth) { this.ops = ops; this.auth = auth; }

    private Account who(HttpSession s, Role... allowed) {
        Object id = s.getAttribute("accountId");
        Account a = id instanceof Integer i ? auth.find(i) : null;
        if (a == null) throw new OpsException(401, "NO_SESSION", "Chưa đăng nhập hoặc phiên đã hết hạn.");
        if (a.isPermanentlyLocked()) { // nhân viên bị khóa (nghỉ việc): phiên đang mở mất hiệu lực ngay (BR-042)
            s.invalidate();
            throw new OpsException(401, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa. Vui lòng liên hệ Chủ quán.");
        }
        if (a.role != Role.OWNER && !List.of(allowed).contains(a.role)) throw new OpsException(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
        return a.actingAs(s.getAttribute(AuthController.STAFF_KEY) instanceof Integer i ? i : null);
    }

    /** Số điểm dùng: số âm chuyển cho tầng nghiệp vụ trả BAD_POINTS; số quá lớn hoặc không nguyên bị chặn ở đây. */
    private static int points(Object o) {
        if (o instanceof Number n && n.doubleValue() < 0) return -1;
        return Objects.requireNonNullElse(Db.money(o, "Số điểm", 1_000_000), 0);
    }

    private static int num(Object o) { return o instanceof Number n ? n.intValue() : -1; }
    /** Nhân viên phụ trách lấy từ thu ngân đã chọn lúc đăng nhập, không nhận từ yêu cầu. */
    private static OpsService.Payer payer(Map<String, Object> b, HttpSession s) {
        return new OpsService.Payer(b.get("customerId") instanceof Number c ? c.intValue() : null, points(b.get("points")),
                s.getAttribute(AuthController.STAFF_KEY) instanceof Integer i ? i : null);
    }
    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> lines(Map<String, Object> b) { return (List<Map<String, Object>>) b.get("lines"); }

    // thực đơn, bàn
    @GetMapping("/menu") public Map<String, Object> menu(HttpSession s) { who(s, Role.WAITER, Role.CASHIER, Role.BARISTA); return ops.menu(); }
    @GetMapping("/tables") public List<Map<String, Object>> tables(HttpSession s) { who(s, Role.WAITER, Role.CASHIER); return ops.tables(); }

    // phục vụ
    @PostMapping("/tables/{no}/orders") public Model.Order send(@PathVariable int no, @RequestBody Map<String, Object> b, HttpSession s) {
        Account a = who(s, Role.WAITER); return ops.send(no, lines(b), a); }
    @GetMapping("/tables/{no}/order") public Model.Order atTable(@PathVariable int no, HttpSession s) { who(s, Role.WAITER, Role.CASHIER); return ops.orderAtTable(no); }
    @PostMapping("/orders/{id}/lines/{lid}/cancel") public Model.Order cancel(@PathVariable int id, @PathVariable int lid, @RequestBody(required = false) Map<String, Object> b, HttpSession s) {
        Account a = who(s, Role.WAITER, Role.CASHIER); return ops.cancelLine(id, lid, b == null ? null : (String) b.get("reason"), a); }
    @PostMapping("/orders/{id}/move") public Model.Order move(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) { who(s, Role.WAITER); return ops.move(id, num(b.get("to"))); }
    @PostMapping("/orders/{id}/finish") public Model.Order finish(@PathVariable int id, HttpSession s) { who(s, Role.WAITER); return ops.finish(id); }

    // pha chế
    @GetMapping("/kitchen") public Map<String, Object> kitchen(HttpSession s) { who(s, Role.BARISTA); return ops.kitchen(); }
    @PostMapping("/kitchen/{lid}/start") public Map<String, Object> start(@PathVariable int lid, HttpSession s) { who(s, Role.BARISTA); return ops.start(lid); }
    @PostMapping("/kitchen/{lid}/done") public Map<String, Object> done(@PathVariable int lid, HttpSession s) { who(s, Role.BARISTA); return ops.done(lid); }

    // thu ngân
    @GetMapping("/shift") public Map<String, Object> shift(HttpSession s) { who(s, Role.CASHIER); return ops.shiftState(); }
    @PostMapping("/shift/open") public Model.Shift open(@RequestBody Map<String, Object> b, HttpSession s) {
        Account a = who(s, Role.CASHIER); return ops.openShift(String.valueOf(b.get("type")), Db.money(b.get("openingCash"), "Tiền mặt đầu ca", 100_000_000), a); }
    @PostMapping("/shift/close") public Model.Shift close(@RequestBody Map<String, Object> b, HttpSession s) {
        Account a = who(s, Role.CASHIER); return ops.closeShift(Db.money(b.get("actualCash"), "Tiền mặt kiểm đếm", 1_000_000_000), a); }
    @GetMapping("/pending") public List<Model.Order> pending(HttpSession s) { who(s, Role.CASHIER); return ops.pending(); }
    @GetMapping("/orders/{id}") public Model.Order get(@PathVariable int id, HttpSession s) { who(s, Role.CASHIER, Role.WAITER); return ops.get(id); }
    @PostMapping("/orders/{id}/pay") public Model.Order pay(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) {
        Account a = who(s, Role.CASHIER); return ops.pay(id, String.valueOf(b.get("method")), Db.money(b.get("received"), "Tiền khách đưa", 1_000_000_000), a, payer(b, s)); }
    @PostMapping("/takeaway") public Model.Order takeaway(@RequestBody Map<String, Object> b, HttpSession s) {
        Account a = who(s, Role.CASHIER);
        return ops.takeaway(lines(b), String.valueOf(b.get("method")), Db.money(b.get("received"), "Tiền khách đưa", 1_000_000_000), a, payer(b, s)); }
    @GetMapping("/takeaway/handovers") public List<Model.Order> handovers(HttpSession s) { who(s, Role.CASHIER); return ops.handovers(); }
    @PostMapping("/orders/{id}/handover") public Model.Order handover(@PathVariable int id, HttpSession s) { Account a = who(s, Role.CASHIER); return ops.handover(id, a); }
    @PostMapping("/takeaway/quote") public Map<String, Object> quote(@RequestBody Map<String, Object> b, HttpSession s) { who(s, Role.CASHIER); return ops.quote(lines(b)); }
    @GetMapping("/drafts") public List<Model.Order> drafts(HttpSession s) { who(s, Role.CASHIER); return ops.drafts(); }
    @PostMapping("/drafts/{id}/confirm") public Model.Order confirm(@PathVariable int id, @RequestBody(required = false) Map<String, Object> b, HttpSession s) {
        Account a = who(s, Role.CASHIER); return ops.confirmDraft(id, a, payer(b == null ? Map.of() : b, s)); }
    @PostMapping("/drafts/{id}/requote") public Model.Order requote(@PathVariable int id, HttpSession s) { Account a = who(s, Role.CASHIER); return ops.requoteDraft(id, a); }
    @PostMapping("/drafts/{id}/cancel") public Model.Order cancelDraft(@PathVariable int id, HttpSession s) { Account a = who(s, Role.CASHIER); return ops.cancelDraft(id, a); }

    @ExceptionHandler(OpsException.class)
    public ResponseEntity<Map<String, Object>> onOps(OpsException e) {
        Map<String, Object> m = new LinkedHashMap<>(e.extra);
        m.put("code", e.code); m.put("message", e.getMessage());
        return ResponseEntity.status(e.status).body(m);
    }
}
