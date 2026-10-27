package cn.aipersona.profile.api;

import cn.aipersona.profile.domain.ProfileDocument;
import cn.aipersona.profile.domain.ProfileDocument.*;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class ProfileDtos {
    private ProfileDtos() {}
    public record EvidenceInput(
        @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{1,64}") String evidenceId,
        @NotNull SourceType sourceType, @NotBlank @Size(max=200) String sourceRef,
        @NotNull @Size(max=300) @Pattern(regexp="^(?:/(?:[^~/]|~[01])*)*$") String targetFieldPath,
        @Size(max=1000) String rawExcerpt, @NotNull JsonNode extractedValue,
        @NotNull EvidenceStatus status) {}
    public record CreateProfileRequest(@NotNull JsonNode profile,
        @NotBlank @Size(max=500) String changeReason,
        @NotNull @Size(max=200) List<@NotNull @Valid EvidenceInput> evidence,
        WriteOrigin origin) {
        public WriteOrigin effectiveOrigin() { return origin == null ? WriteOrigin.USER : origin; }
    }
    public record NewVersionRequest(@Min(1) int expectedCurrentVersion,
        @NotNull JsonNode profile, @NotBlank @Size(max=500) String changeReason,
        @NotNull @Size(max=200) List<@NotNull @Valid EvidenceInput> evidence,
        WriteOrigin origin) {
        public WriteOrigin effectiveOrigin() { return origin == null ? WriteOrigin.USER : origin; }
    }
    public record ValidateProfileRequest(@NotNull JsonNode profile) {}
    public record FieldError(String path, String message) {}
    public record ValidationResult(boolean valid, List<FieldError> errors, ProfileDocument.Readiness readiness) {}
    public record VersionResponse(int version, String schemaVersion, boolean readyForCompilation,
        String changeReason, ProfileDocument profile, Instant createdAt) {}
    public record ProfileResponse(String profileId, String ownerUserId, int currentVersion, String status,
        Instant createdAt, Instant updatedAt, VersionResponse current) {}
    public record ErrorResponse(String code, String message, List<FieldError> errors, Instant timestamp) {}
}
