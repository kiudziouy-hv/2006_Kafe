package vn.vtph.coffee.menu;

import jakarta.servlet.http.HttpSession;
import java.time.Duration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.vtph.coffee.auth.Role;
import vn.vtph.coffee.common.Access;

/** Ảnh món cho nhân viên đã đăng nhập (phục vụ, thu ngân, pha chế) trên màn hình gọi món. */
@RestController
@RequestMapping("/api/ops/menu")
@Profile("mysql")
public class MenuImageController {
    private final MenuImageStore images;
    private final Access access;

    public MenuImageController(MenuImageStore images, Access access) { this.images = images; this.access = access; }

    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> image(@PathVariable int id, HttpSession s) {
        access.who(s, Role.WAITER, Role.CASHIER, Role.BARISTA);
        var img = images.read(MenuImageStore.Kind.ITEM, id);
        if (img == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(img.getKey()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePrivate()).body(img.getValue());
    }

    @GetMapping("/toppings/{id}/image")
    public ResponseEntity<byte[]> toppingImage(@PathVariable int id, HttpSession s) {
        access.who(s, Role.WAITER, Role.CASHIER, Role.BARISTA);
        var img = images.read(MenuImageStore.Kind.TOPPING, id);
        if (img == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(img.getKey()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePrivate()).body(img.getValue());
    }
}
