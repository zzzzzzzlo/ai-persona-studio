package cn.aipersona.profile.persistence;

import com.baomidou.mybatisplus.annotation.*;
import java.time.Instant;

@TableName("persona_profile_evidence")
public class ProfileEvidenceEntity {
    @TableId(type=IdType.AUTO) public Long id;
    public String evidenceId;
    public String profileId;
    public Integer versionNumber;
    public String sourceType;
    public String sourceRef;
    public String targetFieldPath;
    public String rawExcerpt;
    public String extractedValue;
    public String status;
    public Instant createdAt;
}
