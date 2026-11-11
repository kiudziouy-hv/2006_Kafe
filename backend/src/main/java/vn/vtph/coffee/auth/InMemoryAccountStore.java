package vn.vtph.coffee.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Tài khoản thử nghiệm từ mock-accounts.json, giữ trong bộ nhớ (bí mật được băm bcrypt khi nạp). */
@Component
@Profile("!mysql")
public class InMemoryAccountStore implements AccountStore {
    private final Map<Integer, Account> accounts = new LinkedHashMap<>();
    private final PasswordEncoder encoder;

    public InMemoryAccountStore(PasswordEncoder encoder) {
        this.encoder = encoder;
    }

    @PostConstruct
    public void load() throws Exception {
        try (InputStream in = new ClassPathResource("mock-accounts.json").getInputStream()) {
            JsonNode root = new ObjectMapper().readTree(in);
            for (JsonNode n : root.get("accounts")) {
                accounts.put(n.get("id").asInt(), new Account(
                        n.get("id").asInt(), n.get("username").asText(), n.get("fullName").asText(),
                        Role.valueOf(n.get("role").asText()), encoder.encode(n.get("secret").asText())));
            }
        }
    }

    @Override
    public List<Account> all() {
        return new ArrayList<>(accounts.values());
    }

    @Override
    public Optional<Account> byId(int id) {
        return Optional.ofNullable(accounts.get(id));
    }

    @Override
    public Optional<Account> ownerByUsername(String username) {
        return accounts.values().stream()
                .filter(a -> a.role == Role.OWNER && a.username.equalsIgnoreCase(username)).findFirst();
    }

    @Override
    public void saveLockState(Account a) {} // đối tượng được chia sẻ nên đã cập nhật

    @Override
    public void saveHash(Account a) {}
}
