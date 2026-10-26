package vn.vtph.coffee.common;

import java.sql.SQLException;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** MySQL: SIGNAL SQLSTATE '45000' trong trigger/procedure của nhóm = vi phạm quy tắc nghiệp vụ. */
    static final String SQLSTATE_BUSINESS_RULE = "45000";

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiError> handleBusiness(BusinessException ex) {
        return ResponseEntity.status(ex.status()).body(new ApiError(ex.code(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(new ApiError("VALIDATION", msg));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(new ApiError("BAD_REQUEST", "Dữ liệu gửi lên không đúng định dạng"));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiError> handleData(DataAccessException ex) {
        SQLException sql = findSqlException(ex);
        if (sql != null) {
            if (SQLSTATE_BUSINESS_RULE.equals(sql.getSQLState())) {
                // Thông báo do trigger/procedure viết, bắt đầu bằng mã quy tắc (ví dụ "BR-028: ...").
                return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("BUSINESS_RULE", sql.getMessage()));
            }
            switch (sql.getErrorCode()) {
                case 1062 -> {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(new ApiError("DUPLICATE", "Dữ liệu đã tồn tại hoặc bị trùng"));
                }
                case 1451, 1452 -> {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(new ApiError("REFERENCE", "Dữ liệu liên quan không tồn tại hoặc đang được sử dụng"));
                }
                case 3819 -> {
                    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                            .body(new ApiError("CONSTRAINT", "Dữ liệu vi phạm ràng buộc của hệ thống"));
                }
                default -> { }
            }
        }
        log.error("Lỗi truy cập cơ sở dữ liệu", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError("DB_ERROR", "Không thể xử lý yêu cầu, vui lòng thử lại"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleOther(Exception ex) {
        log.error("Lỗi không xác định", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError("INTERNAL", "Đã xảy ra lỗi, vui lòng thử lại"));
    }

    static SQLException findSqlException(Throwable t) {
        for (Throwable c = t; c != null; c = c.getCause()) {
            if (c instanceof SQLException s) {
                return s;
            }
            if (c.getCause() == c) {
                break;
            }
        }
        return null;
    }
}
