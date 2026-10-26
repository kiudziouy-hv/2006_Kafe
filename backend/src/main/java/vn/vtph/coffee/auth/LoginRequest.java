package vn.vtph.coffee.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Vui lòng nhập tên tài khoản") @Size(max = 50) String username,
        @NotBlank(message = "Vui lòng nhập mã PIN/mật khẩu") @Size(max = 100) String secret) {
}
