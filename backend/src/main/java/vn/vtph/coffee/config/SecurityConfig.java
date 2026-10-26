package vn.vtph.coffee.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import vn.vtph.coffee.auth.JwtAuthFilter;
import vn.vtph.coffee.auth.JwtService;
import vn.vtph.coffee.common.ApiError;

/** NFR-011: phân quyền theo vai trò; API không có token hợp lệ thì trả 401, sai vai trò thì trả 403. */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtService jwt, ObjectMapper mapper) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // API stateless dùng Bearer token, không dùng cookie phiên
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/health", "/api/auth/login", "/api/auth/staff").permitAll()
                        .requestMatchers("/api/owner/**").hasRole("OWNER_MANAGER")
                        .requestMatchers(HttpMethod.GET, "/api/tables").hasAnyRole("WAITER", "CASHIER", "OWNER_MANAGER")
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> write(res, mapper, HttpStatus.UNAUTHORIZED,
                                new ApiError("UNAUTHENTICATED", "Vui lòng đăng nhập")))
                        .accessDeniedHandler((req, res, ex) -> write(res, mapper, HttpStatus.FORBIDDEN,
                                new ApiError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này"))))
                .addFilterBefore(new JwtAuthFilter(jwt), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(CorsProperties props) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(props.allowedOrigins());
        cfg.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(java.util.List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cfg);
        return source;
    }

    private static void write(HttpServletResponse res, ObjectMapper mapper, HttpStatus status, ApiError body)
            throws IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        mapper.writeValue(res.getWriter(), body);
    }
}
