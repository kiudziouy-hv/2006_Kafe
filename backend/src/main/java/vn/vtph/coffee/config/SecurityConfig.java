package vn.vtph.coffee.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Phiên đăng nhập bằng cookie (giữ nguyên cơ chế sẵn có của AuthController).
 * Spring Security chặn mọi API chưa đăng nhập; vai trò chi tiết do OpsController kiểm tra (NFR-011).
 * CSRF tắt cho API JSON vì cookie đặt SameSite=Lax và CORS chỉ cho phép các nguồn khai báo (xem ADR-004).
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain api(HttpSecurity http, @Qualifier("corsConfigurationSource") CorsConfigurationSource cors) throws Exception {
        http.cors(c -> c.configurationSource(cors))
            .csrf(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .headers(h -> h.frameOptions(Customizer.withDefaults()))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/auth/**", "/api/health", "/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/**", "/ws/**", "/actuator/**").authenticated()
                .anyRequest().permitAll()); // giao diện tĩnh (src/main/resources/static)
        return http.build();
    }

    /** bcrypt cho PIN và mật khẩu (NFR-012). */
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    /** Đăng nhập do AuthService xử lý, nên không dùng kho người dùng của Spring (tránh mật khẩu mặc định tự sinh trong log). */
    @Bean
    UserDetailsService noUserDetails() {
        return username -> {
            throw new UsernameNotFoundException("Đăng nhập qua /api/auth, không dùng UserDetailsService");
        };
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${vtph.cors.allowed-origins}") List<String> origins) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(origins);
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Content-Type", "Accept", "X-Requested-With"));
        c.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", c);
        return src;
    }
}
