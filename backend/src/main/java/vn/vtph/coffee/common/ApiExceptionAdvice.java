package vn.vtph.coffee.common;

import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import vn.vtph.coffee.ops.OpsException;

/**
 * Lỗi nghiệp vụ dùng chung cho các controller quản trị: {@link OpsException} giữ nguyên mã HTTP của nó;
 * trigger/ràng buộc của CSDL (SQLSTATE 45000, khóa trùng) được đổi thành 409 kèm thông điệp quy tắc nghiệp vụ.
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiExceptionAdvice {

    @ExceptionHandler(OpsException.class)
    public ResponseEntity<Map<String, Object>> onOps(OpsException e) {
        Map<String, Object> m = new LinkedHashMap<>(e.extra);
        m.put("code", e.code);
        m.put("message", e.getMessage());
        return ResponseEntity.status(e.status).body(m);
    }

    /** Lỗi đăng nhập/PIN của các API nằm ngoài AuthController (ví dụ chấm công), cùng khuôn với AuthController. */
    @ExceptionHandler(vn.vtph.coffee.auth.AuthException.class)
    public ResponseEntity<Map<String, Object>> onAuth(vn.vtph.coffee.auth.AuthException e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("code", e.code);
        m.put("message", e.getMessage());
        m.put("attemptsLeft", e.attemptsLeft);
        m.put("lockSeconds", e.lockSeconds);
        return ResponseEntity.status(e.status).body(m);
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<Map<String, Object>> duplicate(DuplicateKeyException e) {
        return body(409, "DUPLICATE", "Dữ liệu bị trùng với bản ghi đã có.");
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> data(DataAccessException e) {
        Throwable t = e;
        while (t != null) {
            if (t instanceof SQLException s && "45000".equals(s.getSQLState())) return body(409, "RULE", s.getMessage());
            t = t.getCause();
        }
        LoggerFactory.getLogger(ApiExceptionAdvice.class).error("Lỗi cơ sở dữ liệu", e);
        return body(500, "INTERNAL", "Hệ thống gặp lỗi. Vui lòng thử lại.");
    }

    private static ResponseEntity<Map<String, Object>> body(int status, String code, String message) {
        return ResponseEntity.status(status).body(Map.of("code", code, "message", message));
    }
}
