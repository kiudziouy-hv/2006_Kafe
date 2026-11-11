package vn.vtph.coffee.ops;

import java.util.Map;

public class OpsException extends RuntimeException {
    public final String code;
    public final int status;
    public final Map<String, Object> extra;

    public OpsException(int status, String code, String message) { this(status, code, message, Map.of()); }

    public OpsException(int status, String code, String message, Map<String, Object> extra) {
        super(message);
        this.status = status;
        this.code = code;
        this.extra = extra;
    }
}
