package vn.vtph.coffee.common;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Lỗi chung cho mọi API, cùng khuôn {code, message} với AuthException và OpsException. Ngoại lệ nghiệp vụ vẫn do từng controller xử lý. */
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException e) {
        Map<String, Object> fields = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> fields.put(f.getField(), f.getDefaultMessage()));
        return body(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION", "Dữ liệu không hợp lệ.", fields);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> unreadable(HttpMessageNotReadableException e) {
        return body(HttpStatus.BAD_REQUEST, "BAD_JSON", "Nội dung gửi lên không đọc được.", null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> unexpected(Exception e) throws Exception {
        if (e instanceof org.springframework.security.access.AccessDeniedException
                || e instanceof org.springframework.web.servlet.resource.NoResourceFoundException) throw e;
        log.error("Lỗi không lường trước", e);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL", "Hệ thống gặp lỗi. Vui lòng thử lại.", null);
    }

    private static ResponseEntity<Map<String, Object>> body(HttpStatus s, String code, String msg, Object fields) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("code", code);
        m.put("message", msg);
        if (fields != null) m.put("fields", fields);
        return ResponseEntity.status(s).body(m);
    }
}
