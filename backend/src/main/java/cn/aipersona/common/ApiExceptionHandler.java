package cn.aipersona.common;

import cn.aipersona.profile.api.ProfileDtos.*;
import cn.aipersona.profile.domain.ProfileException;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.HttpRequestMethodNotSupportedException;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOG=LoggerFactory.getLogger(ApiExceptionHandler.class);
    @ExceptionHandler(ProfileException.class)
    public ResponseEntity<ErrorResponse> profile(ProfileException e) { return error(e.status(),e.code(),e.getMessage(),e.errors()); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> invalid(MethodArgumentNotValidException e) {
        return error(HttpStatus.BAD_REQUEST,"VALIDATION_FAILED","请求字段校验失败",e.getBindingResult().getFieldErrors().stream().map(f -> new FieldError("/"+f.getField().replace('.', '/'),f.getDefaultMessage())).toList());
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> malformed(HttpMessageNotReadableException e) {
        return error(HttpStatus.BAD_REQUEST,"MALFORMED_JSON","JSON 格式、枚举或请求字段不正确",List.of(new FieldError("/","请核对请求格式；不接受未知请求字段")));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> integrity(DataIntegrityViolationException e) {
        return error(HttpStatus.CONFLICT,"DATA_CONFLICT","写入违反唯一性或数据完整性约束，事务已回滚",List.of());
    }
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(NoResourceFoundException e) {
        return error(HttpStatus.NOT_FOUND,"NOT_FOUND","接口或页面不存在",List.of());
    }
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> methodNotAllowed(HttpRequestMethodNotSupportedException e) {
        return error(HttpStatus.METHOD_NOT_ALLOWED,"METHOD_NOT_ALLOWED","此接口不支持该请求方法",List.of());
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> unexpected(Exception e) {
        // Do not log request bodies or potentially sensitive raw excerpts.
        LOG.error("Unhandled server exception: {}",e.getClass().getName());
        return error(HttpStatus.INTERNAL_SERVER_ERROR,"INTERNAL_ERROR","服务暂时不可用",List.of());
    }
    private ResponseEntity<ErrorResponse> error(HttpStatus status,String code,String message,List<FieldError> errors) {
        return ResponseEntity.status(status).body(new ErrorResponse(code,message,errors,Instant.now()));
    }
}
