package vn.vtph.coffee.promotion;

import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import vn.vtph.coffee.common.Access;

/** API chương trình khuyến mãi, chỉ Chủ quán/Quản lý (UC-27). */
@RestController
@RequestMapping("/api/promotions")
@Profile("mysql")
public class PromotionController {
    private final PromotionService promotions;
    private final Access access;

    public PromotionController(PromotionService promotions, Access access) { this.promotions = promotions; this.access = access; }

    @GetMapping public List<Map<String, Object>> list(HttpSession s) { access.who(s); return promotions.list(); }
    @PostMapping public Map<String, Object> create(@RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return promotions.create(b); }
    @PutMapping("/{id}") public Map<String, Object> update(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return promotions.update(id, b); }
    @PostMapping("/{id}/active") public Map<String, Object> active(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) {
        access.who(s); return promotions.setActive(id, Boolean.TRUE.equals(b.get("active"))); }
}
