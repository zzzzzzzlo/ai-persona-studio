package cn.aipersona.profile.persistence;
import com.baomidou.mybatisplus.annotation.*;
import java.time.Instant;
@TableName("persona_questionnaire_submission")
public class QuestionnaireSubmissionEntity {
    @TableId(value="submission_id",type=IdType.INPUT) public String submissionId;
    public String ownerUserId,questionnaireId,questionnaireVersion,requestHash,requestJson,processingStatus,profileId,responseJson;
    public Integer profileVersion;
    public Instant createdAt,processedAt;
}
