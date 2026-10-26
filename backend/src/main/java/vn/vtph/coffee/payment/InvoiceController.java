package vn.vtph.coffee.payment;

import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.auth.Role;
import vn.vtph.coffee.common.Access;
import vn.vtph.coffee.common.Db;
import vn.vtph.coffee.ops.OpsException;

/** API hóa đơn: xem và in lại cho Thu ngân/Chủ quán; hủy hóa đơn, hủy dòng món đã thanh toán và xác nhận hoàn tiền chỉ Chủ quán/Quản lý (BR-026, BR-031). */
@RestController
@RequestMapping("/api/invoices")
@Profile("mysql")
public class InvoiceController {
    private final InvoiceService invoices;
    private final Access access;

    public InvoiceController(InvoiceService invoices, Access access) { this.invoices = invoices; this.access = access; }

    static LocalDate date(String s) {
        try {
            return s == null || s.isBlank() ? null : LocalDate.parse(s);
        } catch (DateTimeParseException e) {
            throw new OpsException(422, "BAD_DATE", "Ngày không hợp lệ.");
        }
    }

    @GetMapping public List<Map<String, Object>> list(@RequestParam(required = false) String from, @RequestParam(required = false) String to,
                                                      @RequestParam(required = false) String status, @RequestParam(required = false) String q, HttpSession s) {
        access.who(s, Role.CASHIER); return invoices.list(date(from), date(to), status, q); }

    @GetMapping("/{id}") public Map<String, Object> detail(@PathVariable int id, HttpSession s) { access.who(s, Role.CASHIER); return invoices.detail(id); }

    @PostMapping("/{id}/reprint") public Map<String, Object> reprint(@PathVariable int id, HttpSession s) { access.who(s, Role.CASHIER); return invoices.reprint(id); }

    @PostMapping("/{id}/cancel") public Map<String, Object> cancel(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) {
        Account a = access.who(s); return invoices.cancel(id, Db.str(b, "reason"), a); }

    @PostMapping("/{id}/lines/{lineId}/cancel") public Map<String, Object> cancelLine(@PathVariable int id, @PathVariable int lineId, @RequestBody Map<String, Object> b, HttpSession s) {
        Account a = access.who(s); return invoices.cancelLine(id, lineId, Db.str(b, "reason"), a); }

    @PostMapping("/refunds/{refundId}/confirm") public Map<String, Object> confirmRefund(@PathVariable int refundId, HttpSession s) {
        Account a = access.who(s); return invoices.confirmRefund(refundId, a); }
}
