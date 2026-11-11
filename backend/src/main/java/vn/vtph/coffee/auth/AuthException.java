package vn.vtph.coffee.auth;

public class AuthException extends RuntimeException {
    public final String code;
    public final int status;
    public final int attemptsLeft;
    public final long lockSeconds;

    public AuthException(String code, String message, int status, int attemptsLeft, long lockSeconds) {
        super(message);
        this.code = code;
        this.status = status;
        this.attemptsLeft = attemptsLeft;
        this.lockSeconds = lockSeconds;
    }
}
