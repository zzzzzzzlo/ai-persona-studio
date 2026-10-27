package cn.aipersona.profile.validation;

import cn.aipersona.profile.api.ProfileDtos.FieldError;
import cn.aipersona.profile.domain.ProfileException;
import com.fasterxml.jackson.databind.JsonNode;
import com.networknt.schema.*;
import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class ProfileSchemaValidator {
    private final JsonSchema schema;
    public ProfileSchemaValidator() throws IOException {
        try (var stream = new ClassPathResource("schema/user-preference-profile.schema.json").getInputStream()) {
            var config = SchemaValidatorsConfig.builder().pathType(PathType.JSON_POINTER).build();
            schema = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012).getSchema(stream, config);
        }
    }
    public List<FieldError> errors(JsonNode document) {
        if (document == null || document.isNull()) return List.of(new FieldError("/profile", "画像不能为空"));
        return schema.validate(document).stream()
            .map(v -> new FieldError(v.getInstanceLocation().toString(), v.getMessage()))
            .sorted(Comparator.comparing(FieldError::path).thenComparing(FieldError::message)).toList();
    }
    public void requireValid(JsonNode document) {
        var errors = errors(document);
        if (!errors.isEmpty()) throw ProfileException.invalid(errors);
    }
}
