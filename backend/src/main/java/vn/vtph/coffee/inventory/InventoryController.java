package vn.vtph.coffee.inventory;

import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.auth.Role;
import vn.vtph.coffee.common.Access;

/** API kho. Chỉ Chủ quán/Quản lý được tạo hoặc sửa công thức, nhập kho, điều chỉnh tồn và xác nhận hao hụt; pha chế chỉ đề xuất hao hụt (BR-016). */
@RestController
@RequestMapping("/api/inventory")
@Profile("mysql")
public class InventoryController {
    private final InventoryService inv;
    private final Access access;

    public InventoryController(InventoryService inv, Access access) { this.inv = inv; this.access = access; }

    @GetMapping("/ingredients") public List<Map<String, Object>> ingredients(HttpSession s) { access.who(s, Role.BARISTA); return inv.ingredients(); }
    @PostMapping("/ingredients") public Map<String, Object> createIngredient(@RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return inv.createIngredient(b); }
    @PutMapping("/ingredients/{id}") public Map<String, Object> updateIngredient(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return inv.updateIngredient(id, b); }

    @GetMapping("/recipes") public List<Map<String, Object>> targets(HttpSession s) { access.who(s); return inv.recipeTargets(); }
    @GetMapping("/recipe") public List<Map<String, Object>> recipe(@RequestParam(required = false) Integer itemId, @RequestParam(required = false) String size,
                                                                  @RequestParam(required = false) Integer toppingId, HttpSession s) { access.who(s); return inv.recipe(itemId, size, toppingId); }
    @PutMapping("/recipe") public List<Map<String, Object>> saveRecipe(@RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return inv.saveRecipe(b); }

    @GetMapping("/receipts") public List<Map<String, Object>> receipts(HttpSession s) { access.who(s); return inv.receipts(); }
    @PostMapping("/receipts") public Map<String, Object> receive(@RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return inv.receive(b); }

    @GetMapping("/adjustments") public List<Map<String, Object>> adjustments(HttpSession s) { access.who(s); return inv.adjustments(); }
    @PostMapping("/adjustments") public Map<String, Object> adjust(@RequestBody Map<String, Object> b, HttpSession s) { Account a = access.who(s); return inv.adjust(b, a); }

    @GetMapping("/waste") public List<Map<String, Object>> waste(@RequestParam(required = false) String status, HttpSession s) { access.who(s, Role.BARISTA); return inv.wasteList(status); }
    @PostMapping("/waste") public Map<String, Object> propose(@RequestBody Map<String, Object> b, HttpSession s) { Account a = access.who(s, Role.BARISTA); return inv.proposeWaste(b, a); }
    @PostMapping("/waste/{id}/confirm") public Map<String, Object> confirm(@PathVariable int id, HttpSession s) { Account a = access.who(s); return inv.decideWaste(id, true, a); }
    @PostMapping("/waste/{id}/reject") public Map<String, Object> reject(@PathVariable int id, HttpSession s) { Account a = access.who(s); return inv.decideWaste(id, false, a); }

    @GetMapping("/alerts") public Map<String, Object> alerts(HttpSession s) { access.who(s); return inv.alerts(); }
}
