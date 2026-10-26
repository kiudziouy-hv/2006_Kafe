package vn.vtph.coffee.shift;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import vn.vtph.coffee.common.Access;

/** API ngày kinh doanh và tổng quan ca, chỉ Chủ quán/Quản lý. Mở và chốt ca thu ngân vẫn ở /api/ops/shift (Chủ quán chốt thay được, FR-M10-007). */
@RestController
@RequestMapping("/api/shift/day")
@Profile("mysql")
public class DayController {
    private final DayService days;
    private final Access access;

    public DayController(DayService days, Access access) { this.days = days; this.access = access; }

    @GetMapping public Map<String, Object> state(HttpSession s) { access.who(s); return days.state(); }
    @PostMapping("/close") public Map<String, Object> close(HttpSession s) { access.who(s); return days.close(); }
}
