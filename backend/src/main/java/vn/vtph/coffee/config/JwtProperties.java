package vn.vtph.coffee.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("vtph.jwt")
public record JwtProperties(String secret, @DefaultValue("600") long ttlMinutes) {
}
