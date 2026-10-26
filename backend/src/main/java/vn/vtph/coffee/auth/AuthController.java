package vn.vtph.coffee.auth;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    public AuthService.LoginResult login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req.username().trim(), req.secret());
    }

    /** Màn "Nhân viên": chọn tài khoản của mình rồi nhập PIN (thiết bị dùng chung). Không gồm Chủ quán/Quản lý. */
    @GetMapping("/staff")
    public List<AuthService.AccountView> staff() {
        return auth.selectableStaff();
    }

    @GetMapping("/me")
    public AuthUser me(@AuthenticationPrincipal AuthUser user) {
        return user;
    }
}
