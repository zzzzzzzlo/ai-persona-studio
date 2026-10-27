package cn.aipersona.profile.domain;

import cn.aipersona.profile.api.ProfileDtos.FieldError;
import java.util.List;
import org.springframework.http.HttpStatus;

public class ProfileException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final List<FieldError> errors;
    public ProfileException(HttpStatus status, String code, String message, List<FieldError> errors) {
        super(message); this.status = status; this.code = code; this.errors = List.copyOf(errors);
    }
    public HttpStatus status() { return status; }
    public String code() { return code; }
    public List<FieldError> errors() { return errors; }
    public static ProfileException invalid(List<FieldError> errors) {
        return new ProfileException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "画像校验失败", errors);
    }
    public static ProfileException conflict() {
        return new ProfileException(HttpStatus.CONFLICT, "VERSION_CONFLICT", "画像已更新，请读取当前版本后重试", List.of(new FieldError("/expectedCurrentVersion", "与数据库当前版本不一致")));
    }
}
