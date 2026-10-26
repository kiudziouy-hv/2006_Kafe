package vn.vtph.coffee.common;

import jakarta.servlet.http.HttpSession;
import java.util.List;
import org.springframework.stereotype.Component;
import vn.vtph.coffee.auth.Account;
import vn.vtph.coffee.auth.AuthService;
import vn.vtph.coffee.auth.Role;
import vn.vtph.coffee.ops.OpsException;

/** Kiểm tra phiên và vai trò ở backend (NFR-011). Chủ quán/Quản lý kế thừa mọi quyền (Chương 3). */
@Component
public class Access {
    private final AuthService auth;

    public Access(AuthService auth) { this.auth = auth; }

    public Account who(HttpSession s, Role... allowed) {
        Object id = s.getAttribute("accountId");
        Account a = id instanceof Integer i ? auth.find(i) : null;
        if (a == null) throw new OpsException(401, "NO_SESSION", "Chưa đăng nhập hoặc phiên đã hết hạn.");
        if (a.role != Role.OWNER && !List.of(allowed).contains(a.role))
            throw new OpsException(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
        return a;
    }
}
