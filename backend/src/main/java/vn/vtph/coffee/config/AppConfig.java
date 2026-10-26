package vn.vtph.coffee.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AppConfig {

    /** Giờ của quán. Các cột DATETIME trong DB không lưu múi giờ nên dùng một múi giờ cố định. */
    public static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Bean
    public Clock clock() {
        return Clock.system(SHOP_ZONE);
    }

    /** NFR-012: mật khẩu và mã PIN được băm bằng BCrypt, không lưu dạng thuần. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
