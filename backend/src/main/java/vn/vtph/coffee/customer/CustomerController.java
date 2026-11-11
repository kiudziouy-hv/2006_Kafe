package vn.vtph.coffee.customer;

import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import vn.vtph.coffee.auth.Role;
import vn.vtph.coffee.common.Access;

/** API thành viên cho Thu ngân (đăng ký, tra cứu khi thanh toán) và Chủ quán/Quản lý. */
@RestController
@RequestMapping("/api/customers")
@Profile("mysql")
public class CustomerController {
    private final CustomerService customers;
    private final Access access;

    public CustomerController(CustomerService customers, Access access) { this.customers = customers; this.access = access; }

    @PostMapping public Map<String, Object> register(@RequestBody Map<String, Object> b, HttpSession s) { access.who(s, Role.CASHIER); return customers.register(b); }
    @GetMapping public List<Map<String, Object>> list(@RequestParam(required = false) String q, HttpSession s) { access.who(s, Role.CASHIER); return customers.list(q); }
    @GetMapping("/lookup") public Map<String, Object> lookup(@RequestParam String phone, HttpSession s) { access.who(s, Role.CASHIER); return customers.lookup(phone); }
}
