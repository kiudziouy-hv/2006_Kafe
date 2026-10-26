package vn.vtph.coffee.common;

import org.springframework.http.HttpStatus;

/** Lỗi nghiệp vụ có chủ đích: trả đúng mã HTTP, mã lỗi và thông báo cho giao diện. */
public class BusinessException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public BusinessException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }
}
