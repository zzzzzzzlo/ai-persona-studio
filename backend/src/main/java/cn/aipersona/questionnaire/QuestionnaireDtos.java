package cn.aipersona.questionnaire;

import cn.aipersona.profile.api.ProfileDtos.FieldError;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import cn.aipersona.profile.domain.ProfileException;

public final class QuestionnaireDtos {
    private QuestionnaireDtos() {}
    public record Answer(List<String> selectedOptionIds, String text, Map<String,String> fields,
        Map<String,List<String>> selections, Map<String,List<String>> subAnswers,
        Map<String,String> customTexts, Map<String,String> anchors, Boolean skipped) {
        public boolean isSkipped() { return Boolean.TRUE.equals(skipped); }
        public List<String> selected() { return selectedOptionIds==null?List.of():selectedOptionIds; }
        public Map<String,String> fieldValues() { return fields==null?Map.of():fields; }
        public Map<String,List<String>> multiple() { return selections==null?Map.of():selections; }
        public Map<String,List<String>> subValues() { return subAnswers==null?Map.of():subAnswers; }
        public Map<String,String> custom() { return customTexts==null?Map.of():customTexts; }
        public Map<String,String> anchorValues() { return anchors==null?Map.of():anchors; }
    }
    public record SubmissionRequest(
        @NotNull @Pattern(regexp="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}") String submissionId,
        @NotBlank String questionnaireId, @NotBlank String questionnaireVersion,
        @NotNull @Size(max=26) Map<@NotBlank String,@NotNull @Valid Answer> answers,
        @Pattern(regexp="[0-9a-fA-F-]{36}") String profileId,
        @Min(1) Integer expectedCurrentVersion) {}
    public record SubmissionResponse(String submissionId,String profileId,int profileVersion,String questionnaireVersion,
        String processingStatus,String profileStatus,boolean readyForCompilation,int clarificationCount,int pendingItemCount,
        List<String> blockers,List<String> warnings,Instant processedAt) {}
    static ProfileException error(HttpStatus status,String code,String message,String path) {
        return new ProfileException(status,code,message,List.of(new FieldError(path,message)));
    }
}
