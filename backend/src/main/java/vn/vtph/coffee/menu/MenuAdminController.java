package vn.vtph.coffee.menu;

import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;
import vn.vtph.coffee.common.Access;

/** API quản lý thực đơn và topping, chỉ Chủ quán/Quản lý (FR-M02). Nhân viên đọc thực đơn qua /api/ops/menu. */
@RestController
@RequestMapping("/api/admin")
@Profile("mysql")
public class MenuAdminController {
    private final MenuAdminService menu;
    private final Access access;

    public MenuAdminController(MenuAdminService menu, Access access) { this.menu = menu; this.access = access; }

    private static String status(Map<String, Object> b) { return String.valueOf(b.get("status")); }

    @GetMapping("/items") public List<Map<String, Object>> items(HttpSession s) { access.who(s); return menu.items(); }
    @PostMapping("/items") public Map<String, Object> create(@RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return menu.createItem(b); }
    @PutMapping("/items/{id}") public Map<String, Object> update(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return menu.updateItem(id, b); }
    @PostMapping("/items/{id}/status") public Map<String, Object> itemStatus(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return menu.setItemStatus(id, status(b)); }
    @PostMapping("/items/{id}/sizes/{size}/status") public Map<String, Object> sizeStatus(@PathVariable int id, @PathVariable String size, @RequestBody Map<String, Object> b, HttpSession s) {
        access.who(s); return menu.setSizeStatus(id, size, status(b)); }

    @PostMapping(value = "/items/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadImage(@PathVariable int id, @RequestParam("file") MultipartFile file, HttpSession s) throws java.io.IOException {
        access.who(s); return menu.saveImage(id, file.getContentType(), file.getBytes()); }
    @GetMapping("/items/{id}/image")
    public ResponseEntity<byte[]> image(@PathVariable int id, HttpSession s) {
        access.who(s);
        var img = menu.readImage(id);
        if (img == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(img.getKey()))
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(30)).cachePrivate()).body(img.getValue());
    }

    @GetMapping("/toppings") public List<Map<String, Object>> toppings(HttpSession s) { access.who(s); return menu.toppings(); }
    @PostMapping("/toppings") public Map<String, Object> createTopping(@RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return menu.createTopping(b); }
    @PutMapping("/toppings/{id}") public Map<String, Object> updateTopping(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return menu.updateTopping(id, b); }
    @PostMapping("/toppings/{id}/status") public Map<String, Object> toppingStatus(@PathVariable int id, @RequestBody Map<String, Object> b, HttpSession s) { access.who(s); return menu.setToppingStatus(id, status(b)); }
}
