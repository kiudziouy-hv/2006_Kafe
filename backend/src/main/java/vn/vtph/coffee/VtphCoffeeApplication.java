package vn.vtph.coffee;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

// Tài khoản lấy từ bảng `account`, nên tắt người dùng mặc định (mật khẩu ngẫu nhiên) của Spring Security.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class VtphCoffeeApplication {

    public static void main(String[] args) {
        SpringApplication.run(VtphCoffeeApplication.class, args);
    }
}
