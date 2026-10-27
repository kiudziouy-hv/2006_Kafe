package vn.vtph.coffee.auth;

import java.time.Instant;

/** Phát hành token đăng nhập. Tách thành interface để kiểm thử logic đăng nhập mà không cần thư viện JWT. */
public interface TokenIssuer {

    record IssuedToken(String token, Instant expiresAt) {
    }

    IssuedToken issue(Account account);
}
