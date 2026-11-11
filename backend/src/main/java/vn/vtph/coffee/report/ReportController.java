package vn.vtph.coffee.report;

import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import vn.vtph.coffee.common.Access;
import vn.vtph.coffee.ops.OpsException;

/** API báo cáo, chỉ Chủ quán/Quản lý (NFR-011). */
@RestController
@RequestMapping("/api/reports")
@Profile("mysql")
public class ReportController {
    private final ReportService reports;
    private final Access access;

    public ReportController(ReportService reports, Access access) { this.reports = reports; this.access = access; }

    private static LocalDate date(String s) {
        try {
            return s == null || s.isBlank() ? null : LocalDate.parse(s);
        } catch (DateTimeParseException e) {
            throw new OpsException(422, "BAD_DATE", "Ngày không hợp lệ.");
        }
    }

    @GetMapping("/summary")
    public Map<String, Object> summary(@RequestParam(required = false) String from, @RequestParam(required = false) String to, HttpSession s) {
        access.who(s);
        return reports.summary(date(from), date(to));
    }
}
